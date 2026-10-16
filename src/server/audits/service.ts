import { and, eq, inArray, sql } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { analyzeWebsiteSnapshot } from "@/modules/audits/analyzer";
import { normalizeAuditUrl } from "@/modules/audits/url-policy";
import { AuditPolicyError, type WebsiteAuditProvider } from "@/modules/audits/types";
import { getDatabase } from "@/server/db";
import { auditFindings, auditJobs, auditLogs, auditPages, companies, websiteAudits, websites } from "@/server/db/schema";

export class AuditRequestError extends Error {
  constructor(message: string) { super(message); this.name = "AuditRequestError"; }
}

export async function queueWebsiteAudit(scope: WorkspaceScope, input: { companyId: string; authorizationConfirmed: boolean }) {
  if (!input.authorizationConfirmed) throw new AuditRequestError("Confirm that this public website review is authorized.");
  const db = getDatabase();
  const [company] = await db.select({ id: companies.id, website: companies.website }).from(companies).where(and(
    eq(companies.workspaceId, scope.workspaceId), eq(companies.id, input.companyId),
  )).limit(1);
  if (!company?.website) throw new AuditRequestError("Choose a workspace company with a valid website.");
  const url = normalizeAuditUrl(company.website);
  const normalizedOrigin = url.origin.toLowerCase();

  return db.transaction(async (tx) => {
    const [website] = await tx.insert(websites).values({
      workspaceId: scope.workspaceId, companyId: company.id, url: url.toString(), normalizedOrigin,
    }).onConflictDoUpdate({
      target: [websites.workspaceId, websites.normalizedOrigin],
      set: { url: url.toString(), updatedAt: new Date() },
    }).returning({ id: websites.id, companyId: websites.companyId });
    if (!website) throw new Error("Website record was not created");
    if (website.companyId !== company.id) throw new AuditRequestError("This website is already linked to another company in the workspace.");

    const [active] = await tx.select({ id: websiteAudits.id }).from(websiteAudits).where(and(
      eq(websiteAudits.workspaceId, scope.workspaceId), eq(websiteAudits.websiteId, website.id),
      inArray(websiteAudits.status, ["queued", "running"]),
    )).limit(1);
    if (active) throw new AuditRequestError("An audit for this website is already queued or running.");

    const [audit] = await tx.insert(websiteAudits).values({
      workspaceId: scope.workspaceId,
      websiteId: website.id,
      requestedByUserId: scope.userId,
      authorizationBasis: "member_confirmed_public_site_review",
    }).returning({ id: websiteAudits.id });
    if (!audit) throw new Error("Website audit was not created");
    await tx.insert(auditJobs).values({ workspaceId: scope.workspaceId, auditId: audit.id });
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "website_audit.queued",
      targetType: "website_audit", targetId: audit.id, metadata: { policyVersion: "single-page-v1" },
    });
    return audit;
  });
}

type ClaimedJob = Readonly<{ id: string; workspaceId: string; auditId: string; attempts: number; maxAttempts: number }>;

export async function claimNextAuditJob(workerId: string): Promise<ClaimedJob | null> {
  const result = await getDatabase().execute<ClaimedJob>(sql`
    with candidate as (
      select id from audit_jobs
      where attempts < max_attempts
        and ((status = 'queued' and run_after <= now()) or (status = 'running' and lease_until < now()))
      order by run_after asc, created_at asc
      for update skip locked
      limit 1
    )
    update audit_jobs as job
    set status = 'running', attempts = job.attempts + 1,
        lease_until = now() + interval '2 minutes', worker_id = ${workerId}, updated_at = now()
    from candidate
    where job.id = candidate.id
    returning job.id, job.workspace_id as "workspaceId", job.audit_id as "auditId",
              job.attempts, job.max_attempts as "maxAttempts"
  `);
  return result.rows[0] ?? null;
}

const terminalPolicyCodes = new Set([
  "invalid_url", "url_credentials", "non_standard_port", "private_destination", "robots_disallowed",
  "response_too_large", "unsupported_content_type", "redirect_limit", "redirect_missing_location",
]);

function safeFailure(error: unknown): { code: string; message: string; blocked: boolean } {
  if (error instanceof AuditPolicyError) return { code: error.code, message: error.message.slice(0, 300), blocked: terminalPolicyCodes.has(error.code) };
  return { code: "worker_error", message: "The audit worker encountered an unexpected error.", blocked: false };
}

export async function processNextAuditJob(provider: WebsiteAuditProvider, workerId: string): Promise<{ auditId: string; status: string } | null> {
  const job = await claimNextAuditJob(workerId);
  if (!job) return null;
  const db = getDatabase();
  const [target] = await db.select({ auditId: websiteAudits.id, url: websites.url }).from(websiteAudits)
    .innerJoin(websites, and(eq(websites.workspaceId, websiteAudits.workspaceId), eq(websites.id, websiteAudits.websiteId)))
    .where(and(eq(websiteAudits.workspaceId, job.workspaceId), eq(websiteAudits.id, job.auditId))).limit(1);
  if (!target) throw new Error("Claimed audit target does not exist");
  await db.update(websiteAudits).set({ status: "running", startedAt: new Date(), errorCode: null, errorMessage: null }).where(and(
    eq(websiteAudits.workspaceId, job.workspaceId), eq(websiteAudits.id, job.auditId),
  ));

  try {
    const snapshot = await provider.inspect(normalizeAuditUrl(target.url));
    const analysis = analyzeWebsiteSnapshot(snapshot);
    const finalStatus = snapshot.status >= 400 ? "partial" : "completed";
    await db.transaction(async (tx) => {
      const [page] = await tx.insert(auditPages).values({
        workspaceId: job.workspaceId, auditId: job.auditId, url: snapshot.finalUrl, status: "completed",
        httpStatus: snapshot.status, contentType: snapshot.contentType, responseBytes: snapshot.responseBytes,
        durationMs: snapshot.durationMs, title: analysis.title, fetchedAt: snapshot.observedAt,
      }).returning({ id: auditPages.id });
      if (!page) throw new Error("Audit page was not created");
      if (analysis.findings.length > 0) await tx.insert(auditFindings).values(analysis.findings.map((item) => ({
        workspaceId: job.workspaceId, auditId: job.auditId, pageId: page.id, category: item.category,
        code: item.code, severity: item.severity, title: item.title, summary: item.summary,
        evidence: item.evidence.slice(0, 500), sourceUrl: snapshot.finalUrl, confidence: item.confidence,
        scoreImpact: item.scoreImpact, observedAt: snapshot.observedAt,
      })));
      await tx.update(websiteAudits).set({
        status: finalStatus, robotsAllowed: true, score: analysis.score, completedAt: new Date(),
      }).where(and(eq(websiteAudits.workspaceId, job.workspaceId), eq(websiteAudits.id, job.auditId)));
      await tx.update(auditJobs).set({ status: "completed", leaseUntil: null, updatedAt: new Date() }).where(and(
        eq(auditJobs.workspaceId, job.workspaceId), eq(auditJobs.id, job.id),
      ));
      await tx.insert(auditLogs).values({
        workspaceId: job.workspaceId, action: "website_audit.completed", targetType: "website_audit",
        targetId: job.auditId, metadata: { status: finalStatus, score: analysis.score, provider: provider.id },
      });
    });
    return { auditId: job.auditId, status: finalStatus };
  } catch (error) {
    const failure = safeFailure(error);
    const exhausted = job.attempts >= job.maxAttempts;
    const auditStatus = failure.blocked ? "blocked" : exhausted ? "failed" : "queued";
    const jobStatus = failure.blocked || exhausted ? "failed" : "queued";
    await db.transaction(async (tx) => {
      await tx.update(websiteAudits).set({
        status: auditStatus, robotsAllowed: failure.code === "robots_disallowed" ? false : null,
        errorCode: failure.code, errorMessage: failure.message,
        completedAt: failure.blocked || exhausted ? new Date() : null,
      }).where(and(eq(websiteAudits.workspaceId, job.workspaceId), eq(websiteAudits.id, job.auditId)));
      await tx.update(auditJobs).set({
        status: jobStatus, leaseUntil: null, workerId: null, lastErrorCode: failure.code,
        runAfter: failure.blocked || exhausted ? new Date() : new Date(Date.now() + job.attempts * 60_000), updatedAt: new Date(),
      }).where(and(eq(auditJobs.workspaceId, job.workspaceId), eq(auditJobs.id, job.id)));
      if (failure.blocked || exhausted) await tx.insert(auditPages).values({
        workspaceId: job.workspaceId, auditId: job.auditId, url: target.url,
        status: failure.blocked ? "blocked" : "failed", errorCode: failure.code, fetchedAt: new Date(),
      });
      await tx.insert(auditLogs).values({
        workspaceId: job.workspaceId, action: `website_audit.${auditStatus}`, targetType: "website_audit",
        targetId: job.auditId, metadata: { errorCode: failure.code, attempt: job.attempts },
      });
    });
    return { auditId: job.auditId, status: auditStatus };
  }
}
