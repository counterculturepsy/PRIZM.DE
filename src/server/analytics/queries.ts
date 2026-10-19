import { and, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { analyticsVersion, canViewRevenueReport, type AnalyticsDealStage } from "@/modules/analytics/metrics";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import { companies, companySources, deals, leads, proposals, workspaces } from "@/server/db/schema";
import { tenantWhere } from "@/server/db/tenant";

type LabelCount = Readonly<{ label: string; count: number }>;
type CurrencyValue = Readonly<{ currency: string; count: number; valueMinor: number; unvaluedCount: number }>;

export type AnalyticsSnapshot = Readonly<{
  version: typeof analyticsVersion;
  asOf: Date;
  workspace: Readonly<{ name: string; timezone: string; defaultCurrency: string }>;
  discovery: Readonly<{
    totalCompanies: number;
    companies7Days: number;
    companies30Days: number;
    companies90Days: number;
    topIndustries: readonly LabelCount[];
    topCities: readonly LabelCount[];
    sources: readonly LabelCount[];
    unattributedCompanies: number;
  }>;
  sales: Readonly<{
    totalLeads: number;
    stages: readonly Readonly<{ stage: AnalyticsDealStage; count: number }>[];
    proposals: number;
    proposedLeads: number;
    approvedProposals: number;
    wonDeals: number;
    lostDeals: number;
    proposalCoveragePercent: number | null;
    wonConversionPercent: number | null;
    averageClosedCycleDays: number | null;
    closedCycleSampleSize: number;
  }>;
  value: Readonly<{
    open: readonly CurrencyValue[];
    won: readonly CurrencyValue[];
  }>;
}>;

function numeric(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isSafeInteger(Math.trunc(parsed))) throw new Error("Analytics aggregate is outside the supported numeric range");
  return parsed;
}

function decimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Analytics decimal aggregate is invalid");
  return parsed;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;
}

function daysBefore(asOf: Date, days: number): Date {
  return new Date(asOf.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getAnalyticsSnapshot(scope: WorkspaceScope, asOf = new Date()): Promise<AnalyticsSnapshot> {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Analytics as-of time is invalid");
  const db = getDatabase();
  const [workspace] = await db.select({ name: workspaces.name, timezone: workspaces.timezone, defaultCurrency: workspaces.currency })
    .from(workspaces).where(eq(workspaces.id, scope.workspaceId)).limit(1);
  if (!workspace) throw new Error("Workspace is unavailable");

  const sevenDaysAgo = daysBefore(asOf, 7);
  const thirtyDaysAgo = daysBefore(asOf, 30);
  const ninetyDaysAgo = daysBefore(asOf, 90);

  const [companyTotalsRows, industryRows, cityRows, sourceRows, attributedRows, leadRows, stageRows, proposalRows, cycleRows] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      sevenDays: sql<number>`count(*) filter (where ${companies.createdAt} >= ${sevenDaysAgo} and ${companies.createdAt} <= ${asOf})::int`,
      thirtyDays: sql<number>`count(*) filter (where ${companies.createdAt} >= ${thirtyDaysAgo} and ${companies.createdAt} <= ${asOf})::int`,
      ninetyDays: sql<number>`count(*) filter (where ${companies.createdAt} >= ${ninetyDaysAgo} and ${companies.createdAt} <= ${asOf})::int`,
    }).from(companies).where(and(tenantWhere(companies.workspaceId, scope), lte(companies.createdAt, asOf))),
    db.select({ label: companies.industry, count: sql<number>`count(*)::int` }).from(companies)
      .where(and(tenantWhere(companies.workspaceId, scope), isNotNull(companies.industry), sql`btrim(${companies.industry}) <> ''`))
      .groupBy(companies.industry).orderBy(desc(sql`count(*)`), companies.industry).limit(10),
    db.select({ label: companies.city, count: sql<number>`count(*)::int` }).from(companies)
      .where(and(tenantWhere(companies.workspaceId, scope), isNotNull(companies.city), sql`btrim(${companies.city}) <> ''`))
      .groupBy(companies.city).orderBy(desc(sql`count(*)`), companies.city).limit(10),
    db.select({ label: companySources.provider, count: sql<number>`count(distinct ${companySources.companyId})::int` }).from(companySources)
      .where(tenantWhere(companySources.workspaceId, scope)).groupBy(companySources.provider)
      .orderBy(desc(sql`count(distinct ${companySources.companyId})`), companySources.provider).limit(10),
    db.select({ count: sql<number>`count(distinct ${companySources.companyId})::int` }).from(companySources)
      .where(tenantWhere(companySources.workspaceId, scope)),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(tenantWhere(leads.workspaceId, scope)),
    db.select({ stage: deals.stage, count: sql<number>`count(*)::int` }).from(deals)
      .where(tenantWhere(deals.workspaceId, scope)).groupBy(deals.stage).orderBy(deals.stage),
    db.select({
      count: sql<number>`count(*)::int`,
      proposedLeads: sql<number>`count(distinct ${proposals.leadId})::int`,
      approved: sql<number>`count(*) filter (where ${proposals.status} = 'approved')::int`,
    }).from(proposals).where(tenantWhere(proposals.workspaceId, scope)),
    db.select({
      averageDays: sql<string | null>`avg(extract(epoch from (${deals.closedAt} - ${leads.createdAt})) / 86400.0)`,
      sampleSize: sql<number>`count(*)::int`,
    }).from(deals).innerJoin(leads, and(eq(leads.workspaceId, deals.workspaceId), eq(leads.id, deals.leadId)))
      .where(and(
        tenantWhere(deals.workspaceId, scope),
        inArray(deals.stage, ["won", "lost"]),
        isNotNull(deals.closedAt),
        sql`${deals.closedAt} >= ${leads.createdAt}`,
      )),
  ]);

  const valueRows = canViewRevenueReport(scope.role) ? await db.select({
    stage: deals.stage,
    currency: deals.currency,
    count: sql<number>`count(*)::int`,
    valueMinor: sql<string>`coalesce(sum(${deals.valueMinor}), 0)`,
    unvaluedCount: sql<number>`count(*) filter (where ${deals.valueMinor} is null)::int`,
  }).from(deals).where(tenantWhere(deals.workspaceId, scope))
    .groupBy(deals.stage, deals.currency).orderBy(deals.stage, deals.currency) : [];

  const companyTotals = companyTotalsRows[0];
  const totalCompanies = numeric(companyTotals?.total);
  const totalLeads = numeric(leadRows[0]?.count);
  const proposalCount = numeric(proposalRows[0]?.count);
  const proposedLeads = numeric(proposalRows[0]?.proposedLeads);
  const approvedProposals = numeric(proposalRows[0]?.approved);
  const attributedCompanies = numeric(attributedRows[0]?.count);

  const stageCounts = new Map<AnalyticsDealStage, number>();
  for (const row of stageRows) stageCounts.set(row.stage, numeric(row.count));
  const stages = (["identified", "contacted", "discovery", "proposal", "negotiation", "won", "lost"] as const)
    .map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 }));

  function valuesFor(stagesToInclude: readonly AnalyticsDealStage[]): CurrencyValue[] {
    const groups = new Map<string, CurrencyValue>();
    for (const row of valueRows) {
      if (!stagesToInclude.includes(row.stage)) continue;
      const current = groups.get(row.currency) ?? { currency: row.currency, count: 0, valueMinor: 0, unvaluedCount: 0 };
      groups.set(row.currency, {
        currency: row.currency,
        count: current.count + numeric(row.count),
        valueMinor: current.valueMinor + numeric(row.valueMinor),
        unvaluedCount: current.unvaluedCount + numeric(row.unvaluedCount),
      });
    }
    return [...groups.values()].sort((left, right) => left.currency.localeCompare(right.currency));
  }

  const wonDeals = stageCounts.get("won") ?? 0;
  const lostDeals = stageCounts.get("lost") ?? 0;
  return {
    version: analyticsVersion,
    asOf: new Date(asOf),
    workspace,
    discovery: {
      totalCompanies,
      companies7Days: numeric(companyTotals?.sevenDays),
      companies30Days: numeric(companyTotals?.thirtyDays),
      companies90Days: numeric(companyTotals?.ninetyDays),
      topIndustries: industryRows.map((row) => ({ label: row.label ?? "Unknown", count: numeric(row.count) })),
      topCities: cityRows.map((row) => ({ label: row.label ?? "Unknown", count: numeric(row.count) })),
      sources: sourceRows.map((row) => ({ label: row.label, count: numeric(row.count) })),
      unattributedCompanies: Math.max(0, totalCompanies - attributedCompanies),
    },
    sales: {
      totalLeads,
      stages,
      proposals: proposalCount,
      proposedLeads,
      approvedProposals,
      wonDeals,
      lostDeals,
      proposalCoveragePercent: ratio(proposedLeads, totalLeads),
      wonConversionPercent: ratio(wonDeals, totalLeads),
      averageClosedCycleDays: decimal(cycleRows[0]?.averageDays),
      closedCycleSampleSize: numeric(cycleRows[0]?.sampleSize),
    },
    value: {
      open: valuesFor(["identified", "contacted", "discovery", "proposal", "negotiation"]),
      won: valuesFor(["won"]),
    },
  };
}
