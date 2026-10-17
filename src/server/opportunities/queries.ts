import { and, desc, eq, sql } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import {
  auditFindings,
  companies,
  leadScores,
  opportunities,
  opportunityEvidence,
} from "@/server/db/schema";
import { tenantWhere } from "@/server/db/tenant";

export function listOpportunityFeed(scope: WorkspaceScope) {
  return getDatabase().select({
    opportunityId: opportunities.id,
    companyId: companies.id,
    companyName: companies.name,
    industry: companies.industry,
    city: companies.city,
    type: opportunities.type,
    title: opportunities.title,
    summary: opportunities.summary,
    confidence: opportunities.confidence,
    totalScore: leadScores.totalScore,
    priority: leadScores.priority,
    calculatedAt: leadScores.calculatedAt,
    estimatedValueMinMinor: opportunities.estimatedValueMinMinor,
    estimatedValueMaxMinor: opportunities.estimatedValueMaxMinor,
    currency: opportunities.currency,
    evidenceCount: sql<number>`(
      select count(*)::int from opportunity_evidence evidence
      where evidence.workspace_id = ${opportunities.workspaceId}
        and evidence.opportunity_id = ${opportunities.id}
    )`,
  }).from(opportunities)
    .innerJoin(leadScores, and(
      eq(leadScores.workspaceId, opportunities.workspaceId),
      eq(leadScores.companyId, opportunities.companyId),
      eq(leadScores.auditId, opportunities.auditId),
      eq(leadScores.isCurrent, true),
    ))
    .innerJoin(companies, and(eq(companies.workspaceId, opportunities.workspaceId), eq(companies.id, opportunities.companyId)))
    .where(tenantWhere(opportunities.workspaceId, scope))
    .orderBy(desc(leadScores.totalScore), desc(leadScores.calculatedAt), companies.name)
    .limit(100);
}

export async function getCompanyOpportunityIntelligence(scope: WorkspaceScope, companyId: string) {
  const [header] = await getDatabase().select({
    companyId: companies.id,
    companyName: companies.name,
    industry: companies.industry,
    city: companies.city,
    totalScore: leadScores.totalScore,
    priority: leadScores.priority,
    components: leadScores.components,
    scoringVersion: leadScores.scoringVersion,
    calculatedAt: leadScores.calculatedAt,
    auditId: leadScores.auditId,
  }).from(companies)
    .innerJoin(leadScores, and(
      eq(leadScores.workspaceId, companies.workspaceId),
      eq(leadScores.companyId, companies.id),
      eq(leadScores.isCurrent, true),
    ))
    .where(and(tenantWhere(companies.workspaceId, scope), eq(companies.id, companyId)))
    .limit(1);
  if (!header) return null;

  const rows = await getDatabase().select({
    opportunityId: opportunities.id,
    type: opportunities.type,
    title: opportunities.title,
    summary: opportunities.summary,
    businessImpact: opportunities.businessImpact,
    recommendedSolution: opportunities.recommendedSolution,
    confidence: opportunities.confidence,
    estimatedValueMinMinor: opportunities.estimatedValueMinMinor,
    estimatedValueMaxMinor: opportunities.estimatedValueMaxMinor,
    currency: opportunities.currency,
    generationVersion: opportunities.generationVersion,
    findingId: auditFindings.id,
    findingTitle: auditFindings.title,
    findingEvidence: auditFindings.evidence,
    findingCategory: auditFindings.category,
    findingObservedAt: auditFindings.observedAt,
  }).from(opportunities)
    .innerJoin(opportunityEvidence, and(
      eq(opportunityEvidence.workspaceId, opportunities.workspaceId),
      eq(opportunityEvidence.auditId, opportunities.auditId),
      eq(opportunityEvidence.opportunityId, opportunities.id),
    ))
    .innerJoin(auditFindings, and(
      eq(auditFindings.workspaceId, opportunityEvidence.workspaceId),
      eq(auditFindings.auditId, opportunityEvidence.auditId),
      eq(auditFindings.id, opportunityEvidence.findingId),
    ))
    .where(and(
      tenantWhere(opportunities.workspaceId, scope),
      eq(opportunities.companyId, companyId),
      eq(opportunities.auditId, header.auditId),
    ))
    .orderBy(opportunities.type, desc(auditFindings.scoreImpact));

  const grouped = new Map<string, {
    opportunity: Omit<(typeof rows)[number], "findingId" | "findingTitle" | "findingEvidence" | "findingCategory" | "findingObservedAt">;
    evidence: Array<Pick<(typeof rows)[number], "findingId" | "findingTitle" | "findingEvidence" | "findingCategory" | "findingObservedAt">>;
  }>();
  for (const row of rows) {
    const { findingId, findingTitle, findingEvidence, findingCategory, findingObservedAt, ...opportunity } = row;
    const existing = grouped.get(row.opportunityId) ?? { opportunity, evidence: [] };
    existing.evidence.push({ findingId, findingTitle, findingEvidence, findingCategory, findingObservedAt });
    grouped.set(row.opportunityId, existing);
  }
  return { ...header, opportunities: [...grouped.values()] } as const;
}
