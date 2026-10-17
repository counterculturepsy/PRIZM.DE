import { and, eq, inArray, sql } from "drizzle-orm";
import { generateOpportunities, OPPORTUNITY_GENERATION_VERSION } from "@/modules/opportunities/generator";
import { calculateLeadScore, LEAD_SCORING_VERSION } from "@/modules/scoring/engine";
import { getDatabase } from "@/server/db";
import {
  auditFindings,
  auditLogs,
  companies,
  idealCustomerProfiles,
  leadScores,
  opportunities,
  opportunityEvidence,
  services,
  websiteAudits,
  websites,
  workspaces,
} from "@/server/db/schema";

export class OpportunityMaterializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpportunityMaterializationError";
  }
}

export async function materializeOpportunityIntelligence(input: {
  workspaceId: string;
  auditId: string;
  actorUserId?: string;
}) {
  const db = getDatabase();
  const [target] = await db.select({
    auditId: websiteAudits.id,
    companyId: companies.id,
    industry: companies.industry,
    city: companies.city,
    email: companies.email,
    phone: companies.phone,
    currency: workspaces.currency,
    completedAt: websiteAudits.completedAt,
  }).from(websiteAudits)
    .innerJoin(websites, and(eq(websites.workspaceId, websiteAudits.workspaceId), eq(websites.id, websiteAudits.websiteId)))
    .innerJoin(companies, and(eq(companies.workspaceId, websites.workspaceId), eq(companies.id, websites.companyId)))
    .innerJoin(workspaces, eq(workspaces.id, websiteAudits.workspaceId))
    .where(and(
      eq(websiteAudits.workspaceId, input.workspaceId),
      eq(websiteAudits.id, input.auditId),
      inArray(websiteAudits.status, ["completed", "partial"]),
    )).limit(1);
  if (!target?.completedAt) throw new OpportunityMaterializationError("Choose a completed tenant-owned audit.");
  const sourceCompletedAt = target.completedAt;

  const [findings, catalogue, profiles] = await Promise.all([
    db.select({
      id: auditFindings.id,
      category: auditFindings.category,
      confidence: auditFindings.confidence,
      scoreImpact: auditFindings.scoreImpact,
    }).from(auditFindings).where(and(
      eq(auditFindings.workspaceId, input.workspaceId),
      eq(auditFindings.auditId, input.auditId),
    )),
    db.select({
      id: services.id,
      slug: services.slug,
      active: services.active,
      startingPriceMinor: services.startingPriceMinor,
      averagePriceMinor: services.averagePriceMinor,
    }).from(services).where(eq(services.workspaceId, input.workspaceId)),
    db.select({ industries: idealCustomerProfiles.industries, cities: idealCustomerProfiles.cities })
      .from(idealCustomerProfiles)
      .where(eq(idealCustomerProfiles.workspaceId, input.workspaceId))
      .limit(1),
  ]);

  const score = calculateLeadScore({
    findings,
    company: { industry: target.industry, city: target.city, email: target.email, phone: target.phone },
    icp: profiles[0] ?? null,
  });
  const generated = generateOpportunities(findings, catalogue);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from companies where workspace_id = ${input.workspaceId} and id = ${target.companyId} for update`);
    const [current] = await tx.select({ sourceCompletedAt: leadScores.sourceCompletedAt }).from(leadScores).where(and(
      eq(leadScores.workspaceId, input.workspaceId), eq(leadScores.companyId, target.companyId), eq(leadScores.isCurrent, true),
    )).limit(1);
    const shouldBeCurrent = !current || sourceCompletedAt >= current.sourceCompletedAt;
    if (shouldBeCurrent) await tx.update(leadScores).set({ isCurrent: false }).where(and(
      eq(leadScores.workspaceId, input.workspaceId), eq(leadScores.companyId, target.companyId), eq(leadScores.isCurrent, true),
    ));
    const [storedScore] = await tx.insert(leadScores).values({
      workspaceId: input.workspaceId,
      companyId: target.companyId,
      auditId: target.auditId,
      totalScore: score.totalScore,
      priority: score.priority,
      components: score.components,
      scoringVersion: LEAD_SCORING_VERSION,
      isCurrent: shouldBeCurrent,
      sourceCompletedAt,
    }).onConflictDoUpdate({
      target: [leadScores.workspaceId, leadScores.auditId, leadScores.scoringVersion],
      set: {
        totalScore: score.totalScore,
        priority: score.priority,
        components: score.components,
        isCurrent: shouldBeCurrent,
        sourceCompletedAt,
        calculatedAt: new Date(),
      },
    }).returning({ id: leadScores.id });
    if (!storedScore) throw new Error("Lead score was not stored");

    await tx.delete(opportunities).where(and(
      eq(opportunities.workspaceId, input.workspaceId),
      eq(opportunities.auditId, input.auditId),
      eq(opportunities.generationVersion, OPPORTUNITY_GENERATION_VERSION),
    ));

    for (const item of generated) {
      const hasPrice = item.estimatedValueMinMinor !== null || item.estimatedValueMaxMinor !== null;
      const [opportunity] = await tx.insert(opportunities).values({
        workspaceId: input.workspaceId,
        companyId: target.companyId,
        auditId: target.auditId,
        serviceId: hasPrice ? item.serviceId : null,
        type: item.type,
        title: item.title,
        summary: item.summary,
        businessImpact: item.businessImpact,
        recommendedSolution: item.recommendedSolution,
        estimatedValueMinMinor: item.estimatedValueMinMinor,
        estimatedValueMaxMinor: item.estimatedValueMaxMinor,
        currency: hasPrice ? target.currency : null,
        confidence: item.confidence,
        generationVersion: item.generationVersion,
      }).returning({ id: opportunities.id });
      if (!opportunity) throw new Error("Opportunity was not stored");
      await tx.insert(opportunityEvidence).values(item.sourceFindingIds.map((findingId) => ({
        workspaceId: input.workspaceId,
        auditId: target.auditId,
        opportunityId: opportunity.id,
        findingId,
      })));
    }

    await tx.insert(auditLogs).values({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: "opportunity_intelligence.materialized",
      targetType: "website_audit",
      targetId: target.auditId,
      metadata: {
        scoringVersion: LEAD_SCORING_VERSION,
        generationVersion: OPPORTUNITY_GENERATION_VERSION,
        totalScore: score.totalScore,
        opportunityCount: generated.length,
      },
    });
    return { scoreId: storedScore.id, totalScore: score.totalScore, opportunityCount: generated.length };
  });
}
