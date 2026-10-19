// @vitest-environment node

import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { companies, companySources, deals, leads, proposals, users, workspaceMembers, workspaces } from "@/server/db/schema";

describe("analytics queries", () => {
  it("produces complete reproducible aggregates without crossing the workspace boundary", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    try {
      const [user] = await db.insert(users).values({ email: "owner@analytics.example", name: "Analytics Owner" }).returning({ id: users.id });
      const [alpha, beta] = await db.insert(workspaces).values([
        { name: "Alpha", slug: "analytics-alpha", timezone: "Africa/Johannesburg", currency: "ZAR" },
        { name: "Beta", slug: "analytics-beta", timezone: "UTC", currency: "USD" },
      ]).returning({ id: workspaces.id });
      if (!user || !alpha || !beta) throw new Error("Analytics workspace fixtures were not created");
      await db.insert(workspaceMembers).values([
        { workspaceId: alpha.id, userId: user.id, role: "owner", status: "active", joinedAt: new Date("2026-01-01T00:00:00Z") },
        { workspaceId: beta.id, userId: user.id, role: "owner", status: "active", joinedAt: new Date("2026-01-01T00:00:00Z") },
      ]);

      const alphaCompanies = await db.insert(companies).values([
        { workspaceId: alpha.id, name: "Recent Studio", dedupeKey: "recent-studio", industry: "Creative", city: "Johannesburg", createdAt: new Date("2026-03-30T12:00:00Z") },
        { workspaceId: alpha.id, name: "March Tech", dedupeKey: "march-tech", industry: "Technology", city: "Cape Town", createdAt: new Date("2026-03-10T12:00:00Z") },
        { workspaceId: alpha.id, name: "January Creative", dedupeKey: "january-creative", industry: "Creative", city: "Johannesburg", createdAt: new Date("2026-01-15T12:00:00Z") },
        { workspaceId: alpha.id, name: "Historic Retail", dedupeKey: "historic-retail", industry: "Retail", city: "Durban", createdAt: new Date("2025-12-01T12:00:00Z") },
      ]).returning({ id: companies.id });
      const [betaCompany] = await db.insert(companies).values({ workspaceId: beta.id, name: "Beta Recent", dedupeKey: "beta-recent", industry: "Secret", city: "Pretoria", createdAt: new Date("2026-03-31T12:00:00Z") }).returning({ id: companies.id });
      if (alphaCompanies.length !== 4 || !betaCompany) throw new Error("Analytics company fixtures were not created");

      await db.insert(companySources).values([
        { workspaceId: alpha.id, companyId: alphaCompanies[0]!.id, provider: "approved_csv", sourceKey: "alpha-source-1", observedAt: new Date("2026-03-30T12:00:00Z") },
        { workspaceId: alpha.id, companyId: alphaCompanies[0]!.id, provider: "manual_research", sourceKey: "alpha-source-2", observedAt: new Date("2026-03-30T12:00:00Z") },
        { workspaceId: alpha.id, companyId: alphaCompanies[1]!.id, provider: "approved_csv", sourceKey: "alpha-source-3", observedAt: new Date("2026-03-10T12:00:00Z") },
        { workspaceId: beta.id, companyId: betaCompany.id, provider: "private_beta", sourceKey: "beta-source-1", observedAt: new Date("2026-03-31T12:00:00Z") },
      ]);

      const alphaLeads = await db.insert(leads).values([
        { workspaceId: alpha.id, companyId: alphaCompanies[0]!.id, title: "Recent campaign", createdAt: new Date("2026-01-01T00:00:00Z") },
        { workspaceId: alpha.id, companyId: alphaCompanies[1]!.id, title: "Technology review", createdAt: new Date("2026-01-05T00:00:00Z") },
        { workspaceId: alpha.id, companyId: alphaCompanies[2]!.id, title: "Creative platform", createdAt: new Date("2026-02-01T00:00:00Z") },
      ]).returning({ id: leads.id });
      const [betaLead] = await db.insert(leads).values({ workspaceId: beta.id, companyId: betaCompany.id, title: "Do not count", createdAt: new Date("2026-03-31T00:00:00Z") }).returning({ id: leads.id });
      if (alphaLeads.length !== 3 || !betaLead) throw new Error("Analytics lead fixtures were not created");

      await db.insert(deals).values([
        { workspaceId: alpha.id, leadId: alphaLeads[0]!.id, stage: "won", valueMinor: 100_000, currency: "ZAR", closedAt: new Date("2026-01-11T00:00:00Z") },
        { workspaceId: alpha.id, leadId: alphaLeads[1]!.id, stage: "lost", valueMinor: 20_000, currency: "USD", closedAt: new Date("2026-01-10T00:00:00Z") },
        { workspaceId: alpha.id, leadId: alphaLeads[2]!.id, stage: "proposal", currency: "ZAR" },
        { workspaceId: beta.id, leadId: betaLead.id, stage: "won", valueMinor: 999_999, currency: "USD", closedAt: new Date("2026-04-01T00:00:00Z") },
      ]);
      await db.insert(proposals).values({
        workspaceId: alpha.id,
        leadId: alphaLeads[0]!.id,
        requestKey: randomUUID(),
        title: "Approved proposal",
        status: "approved",
        createdByUserId: user.id,
        approvedByUserId: user.id,
        approvalNote: "Approved for analytics fixture",
        approvedAt: new Date("2026-01-08T00:00:00Z"),
      });

      vi.resetModules();
      vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
      const { getAnalyticsSnapshot } = await import("./queries");
      const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "owner" });
      const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "owner" });
      const asOf = new Date("2026-04-01T12:00:00Z");

      const report = await getAnalyticsSnapshot(alphaScope, asOf);
      expect(report).toMatchObject({
        version: "analytics-v1",
        workspace: { name: "Alpha", timezone: "Africa/Johannesburg", defaultCurrency: "ZAR" },
        discovery: { totalCompanies: 4, companies7Days: 1, companies30Days: 2, companies90Days: 3, unattributedCompanies: 2 },
        sales: {
          totalLeads: 3,
          proposals: 1,
          proposedLeads: 1,
          approvedProposals: 1,
          wonDeals: 1,
          lostDeals: 1,
          proposalCoveragePercent: 33.3,
          wonConversionPercent: 33.3,
          averageClosedCycleDays: 7.5,
          closedCycleSampleSize: 2,
        },
        value: {
          open: [{ currency: "ZAR", count: 1, valueMinor: 0, unvaluedCount: 1 }],
          won: [{ currency: "ZAR", count: 1, valueMinor: 100_000, unvaluedCount: 0 }],
        },
      });
      expect(report.discovery.topIndustries[0]).toEqual({ label: "Creative", count: 2 });
      expect(report.discovery.topCities[0]).toEqual({ label: "Johannesburg", count: 2 });
      expect(report.discovery.sources).toEqual([
        { label: "approved_csv", count: 2 },
        { label: "manual_research", count: 1 },
      ]);
      expect(report.sales.stages).toContainEqual({ stage: "proposal", count: 1 });

      const betaReport = await getAnalyticsSnapshot(betaScope, asOf);
      expect(betaReport.discovery.totalCompanies).toBe(1);
      expect(betaReport.discovery.sources).toEqual([{ label: "private_beta", count: 1 }]);
      expect(betaReport.sales.totalLeads).toBe(1);
      expect(betaReport.value.won).toEqual([{ currency: "USD", count: 1, valueMinor: 999_999, unvaluedCount: 0 }]);

      const salesScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "sales" });
      const salesReport = await getAnalyticsSnapshot(salesScope, asOf);
      expect(salesReport.sales.totalLeads).toBe(3);
      expect(salesReport.value).toEqual({ open: [], won: [] });
    } finally {
      await client.close();
    }
  });
});
