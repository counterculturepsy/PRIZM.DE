import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CurrencyValues, MethodologyNote, MetricCard, ReportHeader } from "@/components/analytics/report-ui";
import { canViewRevenueReport } from "@/modules/analytics/metrics";
import { getAnalyticsSnapshot } from "@/server/analytics/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Pipeline value" };

export default async function RevenueReportPage() {
  const { scope } = await getWorkspaceContext("read");
  if (!canViewRevenueReport(scope.role)) notFound();
  const report = await getAnalyticsSnapshot(scope);
  const openDeals = report.value.open.reduce((total, group) => total + group.count, 0);
  const wonDeals = report.value.won.reduce((total, group) => total + group.count, 0);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <ReportHeader title="Pipeline value, not recognized revenue" description="A privileged view of values recorded on open and won deals. PRIZM.DEV does not yet have the invoice, payment, refund, or tax ledger required for revenue accounting." asOf={report.asOf} timezone={report.workspace.timezone} version={report.version} showValueReport />
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <MetricCard label="Open deals" value={openDeals} detail="Current non-terminal deals across all stored currencies." />
      <MetricCard label="Won deals" value={wonDeals} detail="Current won deals; this is not proof of collection." />
      <MetricCard label="Workspace default" value={report.workspace.defaultCurrency} detail="Display default only. Stored deal currencies remain authoritative." />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <CurrencyValues title="Open pipeline" groups={report.value.open} emptyLabel="No open deal values have been recorded." />
      <CurrencyValues title="Won deal value" groups={report.value.won} emptyLabel="No won deal values have been recorded." />
    </div>
    <MethodologyNote><p>Values are server-owned deal fields and remain separated by currency. No exchange rates are applied. Won value must not be used as recognized revenue, cash received, profit, or a tax figure. Those measures require the separately gated M10 billing and payment ledger.</p></MethodologyNote>
  </main>;
}
