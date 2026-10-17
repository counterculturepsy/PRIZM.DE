// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import {
  auditFindings,
  companies,
  idealCustomerProfiles,
  leadScores,
  opportunities,
  opportunityEvidence,
  services,
  users,
  websiteAudits,
  websites,
  workspaces,
} from "@/server/db/schema";

describe("opportunity intelligence materialization", () => {
  it("persists idempotent evidence-backed intelligence and enforces tenant/audit boundaries", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "m4@example.com" }).returning({ id: users.id });
    const [alpha, beta] = await db.insert(workspaces).values([
      { name: "Alpha", slug: "m4-alpha", currency: "ZAR" },
      { name: "Beta", slug: "m4-beta", currency: "ZAR" },
    ]).returning({ id: workspaces.id });
    if (!user || !alpha || !beta) throw new Error("Workspace fixtures were not created");
    const [company] = await db.insert(companies).values({
      workspaceId: alpha.id,
      name: "Alpha Hotel",
      dedupeKey: "domain:alpha-hotel.example",
      website: "https://alpha-hotel.example",
      domain: "alpha-hotel.example",
      industry: "Hospitality",
      city: "Johannesburg",
      email: "hello@alpha-hotel.example",
    }).returning({ id: companies.id });
    if (!company) throw new Error("Company fixture was not created");
    await db.insert(idealCustomerProfiles).values({
      workspaceId: alpha.id,
      industries: ["Hospitality"],
      cities: ["Johannesburg"],
    });
    const [service] = await db.insert(services).values({
      workspaceId: alpha.id,
      name: "Accessibility audit",
      slug: "accessibility-audit",
      startingPriceMinor: 15_000,
      averagePriceMinor: 25_000,
    }).returning({ id: services.id });
    const [website] = await db.insert(websites).values({
      workspaceId: alpha.id,
      companyId: company.id,
      url: "https://alpha-hotel.example/",
      normalizedOrigin: "https://alpha-hotel.example",
    }).returning({ id: websites.id });
    if (!service || !website) throw new Error("Service or website fixture was not created");
    const [audit, otherAudit] = await db.insert(websiteAudits).values([
      { workspaceId: alpha.id, websiteId: website.id, requestedByUserId: user.id, status: "completed", authorizationBasis: "test", completedAt: new Date("2026-10-17T10:00:00Z") },
      { workspaceId: alpha.id, websiteId: website.id, requestedByUserId: user.id, status: "completed", authorizationBasis: "test", completedAt: new Date("2026-10-16T10:00:00Z") },
    ]).returning({ id: websiteAudits.id });
    if (!audit || !otherAudit) throw new Error("Audit fixtures were not created");
    const [accessibilityFinding, securityFinding] = await db.insert(auditFindings).values([
      {
        workspaceId: alpha.id,
        auditId: audit.id,
        category: "accessibility",
        code: "a11y.form_label_missing",
        severity: "high",
        title: "Form controls lack labels",
        summary: "A bounded test finding.",
        evidence: "2 controls",
        sourceUrl: "https://alpha-hotel.example/",
        confidence: "high",
        scoreImpact: 20,
        observedAt: new Date(),
      },
      {
        workspaceId: alpha.id,
        auditId: audit.id,
        category: "security",
        code: "security.csp_missing",
        severity: "medium",
        title: "CSP not observed",
        summary: "A bounded test finding.",
        evidence: "Header absent",
        sourceUrl: "https://alpha-hotel.example/",
        confidence: "medium",
        scoreImpact: 6,
        observedAt: new Date(),
      },
    ]).returning({ id: auditFindings.id });
    const [otherFinding] = await db.insert(auditFindings).values({
      workspaceId: alpha.id,
      auditId: otherAudit.id,
      category: "seo",
      code: "seo.title_missing",
      severity: "medium",
      title: "Title missing",
      summary: "A separate audit finding.",
      evidence: "Title absent",
      sourceUrl: "https://alpha-hotel.example/",
      confidence: "high",
      scoreImpact: 10,
      observedAt: new Date(),
    }).returning({ id: auditFindings.id });
    if (!accessibilityFinding || !securityFinding || !otherFinding) throw new Error("Finding fixtures were not created");

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const { materializeOpportunityIntelligence, OpportunityMaterializationError } = await import("./service");
    await expect(materializeOpportunityIntelligence({ workspaceId: beta.id, auditId: audit.id })).rejects.toBeInstanceOf(OpportunityMaterializationError);
    await expect(materializeOpportunityIntelligence({ workspaceId: alpha.id, auditId: audit.id, actorUserId: user.id })).resolves.toMatchObject({ totalScore: 60, opportunityCount: 2 });
    await expect(materializeOpportunityIntelligence({ workspaceId: alpha.id, auditId: audit.id })).resolves.toMatchObject({ totalScore: 60, opportunityCount: 2 });

    const storedScores = await db.select().from(leadScores).where(and(eq(leadScores.workspaceId, alpha.id), eq(leadScores.auditId, audit.id)));
    const storedOpportunities = await db.select().from(opportunities).where(and(eq(opportunities.workspaceId, alpha.id), eq(opportunities.auditId, audit.id)));
    const storedEvidence = await db.select().from(opportunityEvidence).where(and(eq(opportunityEvidence.workspaceId, alpha.id), eq(opportunityEvidence.auditId, audit.id)));
    expect(storedScores).toHaveLength(1);
    expect(storedScores[0]).toMatchObject({ totalScore: 60, priority: "good", isCurrent: true });
    expect(storedOpportunities).toHaveLength(2);
    expect(storedEvidence).toHaveLength(2);
    expect(storedOpportunities.find((item) => item.type === "accessibility_remediation")).toMatchObject({
      serviceId: service.id,
      estimatedValueMinMinor: 15_000,
      estimatedValueMaxMinor: 25_000,
      currency: "ZAR",
      confidence: "high",
    });

    const { getCompanyOpportunityIntelligence, listOpportunityFeed } = await import("./queries");
    const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "developer" });
    const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "developer" });
    await expect(listOpportunityFeed(alphaScope)).resolves.toHaveLength(2);
    await expect(listOpportunityFeed(betaScope)).resolves.toHaveLength(0);
    await expect(getCompanyOpportunityIntelligence(alphaScope, company.id)).resolves.toMatchObject({ companyId: company.id, totalScore: 60 });
    await expect(getCompanyOpportunityIntelligence(betaScope, company.id)).resolves.toBeNull();

    await materializeOpportunityIntelligence({ workspaceId: alpha.id, auditId: otherAudit.id });
    const scoreHistory = await db.select({ auditId: leadScores.auditId, isCurrent: leadScores.isCurrent }).from(leadScores)
      .where(and(eq(leadScores.workspaceId, alpha.id), eq(leadScores.companyId, company.id)));
    expect(scoreHistory.find((item) => item.auditId === audit.id)?.isCurrent).toBe(true);
    expect(scoreHistory.find((item) => item.auditId === otherAudit.id)?.isCurrent).toBe(false);

    await expect(db.insert(opportunities).values({
      workspaceId: beta.id,
      companyId: company.id,
      auditId: audit.id,
      type: "website_improvement",
      title: "Invalid cross-tenant opportunity",
      summary: "Invalid",
      businessImpact: "Invalid",
      recommendedSolution: "Invalid",
      confidence: "low",
    })).rejects.toThrow();

    const sourceOpportunity = storedOpportunities[0];
    if (!sourceOpportunity) throw new Error("Opportunity fixture was not created");
    await expect(db.insert(opportunityEvidence).values({
      workspaceId: alpha.id,
      auditId: otherAudit.id,
      opportunityId: sourceOpportunity.id,
      findingId: otherFinding.id,
    })).rejects.toThrow();
    await client.close();
  });
});
