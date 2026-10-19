import type { Metadata } from "next";
import { CurrencyValues, MethodologyNote, MetricCard, ReportHeader } from "@/components/analytics/report-ui";
import { Card } from "@/components/ui/card";
import { canViewRevenueReport, dealStageLabels, formatCycleDays, formatMetricPercent } from "@/modules/analytics/metrics";
import { getAnalyticsSnapshot } from "@/server/analytics/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Sales analytics" };

export default async function SalesReportPage() {
  const { scope } = await getWorkspaceContext("read");
  const report = await getAnalyticsSnapshot(scope);
  const canViewValue = canViewRevenueReport(scope.role);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <ReportHeader title="Sales analytics" description="A reproducible snapshot of the current CRM pipeline, proposal coverage, and closed outcomes." asOf={report.asOf} timezone={report.workspace.timezone} version={report.version} showValueReport={canViewValue} />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="CRM leads" value={report.sales.totalLeads} detail="All current workspace-owned lead records." />
      <MetricCard label="Proposal coverage" value={formatMetricPercent(report.sales.proposalCoveragePercent)} detail={`${report.sales.proposedLeads} leads have ${report.sales.proposals} proposal records; ${report.sales.approvedProposals} approved.`} />
      <MetricCard label="Won snapshot ratio" value={formatMetricPercent(report.sales.wonConversionPercent)} detail={`${report.sales.wonDeals} won and ${report.sales.lostDeals} lost current deals.`} />
      <MetricCard label="Average closed cycle" value={formatCycleDays(report.sales.averageClosedCycleDays)} detail={`${report.sales.closedCycleSampleSize} valid won/lost closing timestamps in the sample.`} />
    </div>
    <div className={`mt-6 grid gap-6 ${canViewValue ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
      <Card className="p-6"><h2 className="text-lg font-semibold">Current stage distribution</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{report.sales.stages.map((stage) => <div className="flex items-center justify-between rounded-xl border border-border p-4" key={stage.stage}><span className="text-sm">{dealStageLabels[stage.stage]}</span><span className="font-mono text-lg tabular-nums text-cyan">{stage.count}</span></div>)}</div></Card>
      {canViewValue ? <CurrencyValues title="Open pipeline value" groups={report.value.open} emptyLabel="No open deals have been recorded." /> : null}
    </div>
    <MethodologyNote><p>Stage counts describe each deal&apos;s current state. They do not reconstruct historical transitions, replies, or meetings. Proposal coverage and won conversion are snapshot ratios rather than cohort forecasts.{canViewValue ? " Deal values are grouped by stored currency and are never converted." : " Deal values are restricted to workspace Owners and Admins."}</p></MethodologyNote>
  </main>;
}
