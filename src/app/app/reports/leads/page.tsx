import type { Metadata } from "next";
import { MethodologyNote, MetricCard, RankedList, ReportHeader } from "@/components/analytics/report-ui";
import { canViewRevenueReport, formatMetricPercent, ratioPercent } from "@/modules/analytics/metrics";
import { getAnalyticsSnapshot } from "@/server/analytics/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Lead analytics" };

export default async function LeadReportPage() {
  const { scope } = await getWorkspaceContext("read");
  const report = await getAnalyticsSnapshot(scope);
  const crmCoverage = ratioPercent(report.sales.totalLeads, report.discovery.totalCompanies);
  const sources = [...report.discovery.sources, { label: "Unattributed", count: report.discovery.unattributedCompanies }].filter((row) => row.count > 0);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <ReportHeader title="Lead analytics" description="Source coverage and market composition for the companies this workspace has deliberately imported or recorded." asOf={report.asOf} timezone={report.workspace.timezone} version={report.version} showValueReport={canViewRevenueReport(scope.role)} />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="All companies" value={report.discovery.totalCompanies} detail="Current workspace company records." />
      <MetricCard label="Added in 7 days" value={report.discovery.companies7Days} detail="Created on or after the captured time minus 7 days." />
      <MetricCard label="Added in 30 days" value={report.discovery.companies30Days} detail="Created on or after the captured time minus 30 days." />
      <MetricCard label="Added in 90 days" value={report.discovery.companies90Days} detail="Created on or after the captured time minus 90 days." />
      <MetricCard label="CRM coverage" value={formatMetricPercent(crmCoverage)} detail={`${report.sales.totalLeads} companies have been converted to CRM leads.`} />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <RankedList title="Source providers" rows={sources} emptyLabel="No company source records yet." />
      <RankedList title="Top industries" rows={report.discovery.topIndustries} emptyLabel="No industry values recorded yet." />
      <RankedList title="Top cities" rows={report.discovery.topCities} emptyLabel="No city values recorded yet." />
    </div>
    <MethodologyNote><p>Provider counts use distinct companies. A company may have evidence from more than one provider, so source rows should not be added together. “Unattributed” means no source record exists; it does not judge source quality. Windows are exact rolling durations from the captured instant.</p></MethodologyNote>
  </main>;
}
