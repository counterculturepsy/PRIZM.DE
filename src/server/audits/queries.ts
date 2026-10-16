import { and, desc, eq } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import { auditFindings, auditPages, companies, websiteAudits, websites } from "@/server/db/schema";
import { tenantWhere } from "@/server/db/tenant";

export function listAuditCandidates(scope: WorkspaceScope) {
  return getDatabase().select({ id: companies.id, name: companies.name, website: companies.website }).from(companies)
    .where(tenantWhere(companies.workspaceId, scope)).orderBy(companies.name);
}

export function listWebsiteAudits(scope: WorkspaceScope) {
  return getDatabase().select({
    id: websiteAudits.id, status: websiteAudits.status, score: websiteAudits.score,
    requestedAt: websiteAudits.requestedAt, completedAt: websiteAudits.completedAt,
    companyId: companies.id, companyName: companies.name, url: websites.url,
  }).from(websiteAudits)
    .innerJoin(websites, and(eq(websites.workspaceId, websiteAudits.workspaceId), eq(websites.id, websiteAudits.websiteId)))
    .innerJoin(companies, and(eq(companies.workspaceId, websites.workspaceId), eq(companies.id, websites.companyId)))
    .where(tenantWhere(websiteAudits.workspaceId, scope)).orderBy(desc(websiteAudits.requestedAt));
}

export async function getWebsiteAudit(scope: WorkspaceScope, auditId: string) {
  const [audit] = await getDatabase().select({
    id: websiteAudits.id, status: websiteAudits.status, score: websiteAudits.score,
    policyVersion: websiteAudits.policyVersion, scoringVersion: websiteAudits.scoringVersion,
    robotsAllowed: websiteAudits.robotsAllowed, errorCode: websiteAudits.errorCode,
    errorMessage: websiteAudits.errorMessage, requestedAt: websiteAudits.requestedAt,
    startedAt: websiteAudits.startedAt, completedAt: websiteAudits.completedAt,
    companyId: companies.id, companyName: companies.name, url: websites.url,
  }).from(websiteAudits)
    .innerJoin(websites, and(eq(websites.workspaceId, websiteAudits.workspaceId), eq(websites.id, websiteAudits.websiteId)))
    .innerJoin(companies, and(eq(companies.workspaceId, websites.workspaceId), eq(companies.id, websites.companyId)))
    .where(and(tenantWhere(websiteAudits.workspaceId, scope), eq(websiteAudits.id, auditId))).limit(1);
  if (!audit) return null;
  const [pages, findings] = await Promise.all([
    getDatabase().select().from(auditPages).where(and(tenantWhere(auditPages.workspaceId, scope), eq(auditPages.auditId, auditId))).orderBy(desc(auditPages.fetchedAt)),
    getDatabase().select().from(auditFindings).where(and(tenantWhere(auditFindings.workspaceId, scope), eq(auditFindings.auditId, auditId))).orderBy(desc(auditFindings.scoreImpact)),
  ]);
  return { audit, pages, findings } as const;
}
