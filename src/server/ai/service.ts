import { and, desc, eq, gte, sql } from "drizzle-orm";
import { hasCapability, type WorkspaceScope } from "@/modules/workspaces/scope";
import type { AIProvider } from "@/modules/ai/provider";
import { PROMPT_VERSION, policySchema, redactEvidence, reviewSchema, salesDraftSchema, validateGrounding, type SalesEvidence } from "@/modules/ai/sales";
import { getDatabase } from "@/server/db";
import { aiDraftRuns, aiWorkspacePolicies, auditFindings, auditLogs, leads, leadScores, workspaceMembers, workspaces } from "@/server/db/schema";
import { configuredSalesProvider, SalesProviderError } from "./provider";

export class SalesAssistantError extends Error {}

async function authorize(scope: WorkspaceScope, capability: "write" | "manage_workspace") {
  if (!hasCapability(scope, capability)) throw new SalesAssistantError("Your role cannot perform this action.");
  const [member] = await getDatabase().select({ role: workspaceMembers.role }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, scope.workspaceId), eq(workspaceMembers.userId, scope.userId), eq(workspaceMembers.status, "active"), eq(workspaces.status, "active"))).limit(1);
  if (!member || member.role !== scope.role) throw new SalesAssistantError("Workspace membership changed. Refresh and try again.");
}

export async function saveAiPolicy(scope: WorkspaceScope, input: { enabled: boolean; dailyRequestLimit: number }) {
  await authorize(scope, "manage_workspace");
  const parsed = policySchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    await tx.execute(sql`select id from workspaces where id = ${scope.workspaceId} for update`);
    await tx.insert(aiWorkspacePolicies).values({ workspaceId: scope.workspaceId, ...parsed }).onConflictDoUpdate({
      target: aiWorkspacePolicies.workspaceId, set: { ...parsed, updatedAt: new Date() },
    });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "ai.policy_updated", targetType: "ai_policy", targetId: scope.workspaceId, metadata: parsed });
  });
}

export async function generateSalesDraft(scope: WorkspaceScope, input: { leadId: string; purpose: "strategy" | "outreach"; requestKey: string }, adapter?: { provider: AIProvider; model: string }) {
  await authorize(scope, "write");
  const db = getDatabase();
  const configured = adapter ?? configuredSalesProvider();
  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from workspaces where id = ${scope.workspaceId} for update`);
    const [existing] = await tx.select().from(aiDraftRuns).where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.requestKey, input.requestKey))).limit(1);
    if (existing) {
      if (existing.leadId !== input.leadId || existing.purpose !== input.purpose) throw new SalesAssistantError("This request key was already used for a different draft.");
      return { id: existing.id, evidence: existing.evidence, created: false };
    }
    if (configured.provider.id === "disabled") throw new SalesAssistantError("AI generation is disabled in the server configuration.");
    const [policy] = await tx.select().from(aiWorkspacePolicies).where(eq(aiWorkspacePolicies.workspaceId, scope.workspaceId)).limit(1);
    if (!policy?.enabled) throw new SalesAssistantError("Ask a workspace administrator to enable AI drafting in settings.");
    const [lead] = await tx.select({ id: leads.id, companyId: leads.companyId }).from(leads)
      .where(and(eq(leads.workspaceId, scope.workspaceId), eq(leads.id, input.leadId))).limit(1);
    if (!lead) throw new SalesAssistantError("Choose a lead in the active workspace.");
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
    const [usage] = await tx.select({ count: sql<number>`count(*)::int` }).from(aiDraftRuns).where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), gte(aiDraftRuns.createdAt, midnight)));
    if ((usage?.count ?? 0) >= policy.dailyRequestLimit) throw new SalesAssistantError("The workspace daily AI request budget is exhausted. It resets at 00:00 UTC.");
    const rows = await tx.select({ id: auditFindings.id, category: auditFindings.category, confidence: auditFindings.confidence, observedAt: auditFindings.observedAt, title: auditFindings.title, evidence: auditFindings.evidence })
      .from(auditFindings).innerJoin(leadScores, and(eq(leadScores.workspaceId, auditFindings.workspaceId), eq(leadScores.auditId, auditFindings.auditId)))
      .where(and(eq(auditFindings.workspaceId, scope.workspaceId), eq(leadScores.companyId, lead.companyId), eq(leadScores.isCurrent, true)))
      .orderBy(desc(auditFindings.scoreImpact), auditFindings.id).limit(12);
    if (!rows.length) throw new SalesAssistantError("Complete an authorized website audit and materialize its evidence before drafting.");
    const evidence: SalesEvidence[] = rows.map((row) => ({ id: row.id, category: row.category, confidence: row.confidence, observedAt: row.observedAt.toISOString(), excerpt: redactEvidence(`${row.title}: ${row.evidence}`) }));
    const [run] = await tx.insert(aiDraftRuns).values({ workspaceId: scope.workspaceId, leadId: lead.id, actorUserId: scope.userId, requestKey: input.requestKey, purpose: input.purpose, provider: configured.provider.id, model: configured.model, promptVersion: PROMPT_VERSION, evidence }).returning({ id: aiDraftRuns.id });
    if (!run) throw new SalesAssistantError("The draft request could not be reserved.");
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "ai.draft_requested", targetType: "ai_draft", targetId: run.id, metadata: { purpose: input.purpose } });
    return { id: run.id, evidence, created: true };
  });
  if (!reserved.created) return reserved.id;
  const started = Date.now();
  try {
    const result = await configured.provider.generateStructured({
      workspaceId: scope.workspaceId, requestId: reserved.id, purpose: input.purpose,
      input: { subject: "the prospective business", budget: { maximumOutputTokens: 2000 } },
      evidence: reserved.evidence.map((item) => ({ source: item.id, observedAt: item.observedAt, excerpt: JSON.stringify(item) })),
    }, salesDraftSchema);
    const output = validateGrounding(result.output, reserved.evidence);
    await db.transaction(async (tx) => {
      await tx.update(aiDraftRuns).set({ status: "completed", output, inputTokens: result.inputTokens ?? null, outputTokens: result.outputTokens ?? null, durationMs: result.durationMs, completedAt: new Date() })
        .where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.id, reserved.id), eq(aiDraftRuns.status, "running")));
      await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "ai.draft_completed", targetType: "ai_draft", targetId: reserved.id });
    });
  } catch (error) {
    const errorCode = error instanceof SalesProviderError ? error.code : "generation_failed";
    await db.transaction(async (tx) => {
      await tx.update(aiDraftRuns).set({ status: "failed", errorCode, durationMs: Date.now() - started, completedAt: new Date() })
        .where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.id, reserved.id), eq(aiDraftRuns.status, "running")));
      await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "ai.draft_failed", targetType: "ai_draft", targetId: reserved.id, metadata: { errorCode } });
    });
  }
  return reserved.id;
}

export async function reviewSalesDraft(scope: WorkspaceScope, input: { draftId: string; decision: "approved" | "rejected"; note: string }) {
  await authorize(scope, "write");
  const parsed = reviewSchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    const [updated] = await tx.update(aiDraftRuns).set({ reviewStatus: parsed.decision, reviewNote: parsed.note, reviewerUserId: scope.userId, reviewedAt: new Date() })
      .where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.id, parsed.draftId), eq(aiDraftRuns.status, "completed"), eq(aiDraftRuns.reviewStatus, "pending")))
      .returning({ id: aiDraftRuns.id });
    if (!updated) throw new SalesAssistantError("This draft is unavailable or has already been reviewed.");
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: `ai.draft_${parsed.decision}`, targetType: "ai_draft", targetId: updated.id });
  });
}

export async function getAiPolicy(scope: WorkspaceScope) {
  const [policy] = await getDatabase().select().from(aiWorkspacePolicies).where(eq(aiWorkspacePolicies.workspaceId, scope.workspaceId)).limit(1);
  return policy ?? { enabled: false, dailyRequestLimit: 10 };
}

export function listSalesDrafts(scope: WorkspaceScope, purpose: "strategy" | "outreach") {
  return getDatabase().select({ id: aiDraftRuns.id, leadId: leads.id, leadTitle: leads.title, status: aiDraftRuns.status, reviewStatus: aiDraftRuns.reviewStatus, createdAt: aiDraftRuns.createdAt })
    .from(aiDraftRuns).innerJoin(leads, and(eq(leads.workspaceId, aiDraftRuns.workspaceId), eq(leads.id, aiDraftRuns.leadId)))
    .where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.purpose, purpose))).orderBy(desc(aiDraftRuns.createdAt)).limit(100);
}

export async function getSalesDraft(scope: WorkspaceScope, id: string) {
  const [run] = await getDatabase().select().from(aiDraftRuns).where(and(eq(aiDraftRuns.workspaceId, scope.workspaceId), eq(aiDraftRuns.id, id))).limit(1);
  return run ?? null;
}
