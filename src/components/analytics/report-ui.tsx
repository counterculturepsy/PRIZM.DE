import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatAnalyticsTime, formatMinorAmount } from "@/modules/analytics/metrics";

export function ReportHeader({ title, description, asOf, timezone, version, showValueReport }: {
  title: string;
  description: string;
  asOf: Date;
  timezone: string;
  version: string;
  showValueReport: boolean;
}) {
  return <>
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">M9 · Analytics</p>
    <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
    <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{description}</p>
    <nav aria-label="Analytics reports" className="mt-6 flex flex-wrap gap-2 text-sm">
      <Link className="rounded-lg border border-border px-3 py-2 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/app/reports/sales">Sales</Link>
      <Link className="rounded-lg border border-border px-3 py-2 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/app/reports/leads">Leads</Link>
      {showValueReport ? <Link className="rounded-lg border border-border px-3 py-2 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/app/reports/revenue">Value</Link> : null}
    </nav>
    <p className="mt-4 font-mono text-xs text-muted-foreground">{version} · Captured {formatAnalyticsTime(asOf, timezone)} · {timezone}</p>
  </>;
}

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></Card>;
}

export function RankedList({ title, rows, emptyLabel }: { title: string; rows: readonly { label: string; count: number }[]; emptyLabel: string }) {
  return <Card className="p-6"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-5 grid gap-3">{rows.map((row) => <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0" key={row.label}><span className="min-w-0 truncate text-sm">{row.label}</span><span className="font-mono text-sm tabular-nums text-cyan">{row.count}</span></div>)}{rows.length === 0 ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}</div></Card>;
}

export function CurrencyValues({ title, groups, emptyLabel }: {
  title: string;
  groups: readonly { currency: string; count: number; valueMinor: number; unvaluedCount: number }[];
  emptyLabel: string;
}) {
  return <Card className="p-6"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-5 grid gap-4">{groups.map((group) => <article className="rounded-xl border border-border p-4" key={group.currency}><div className="flex flex-wrap items-baseline justify-between gap-3"><h3 className="font-mono text-sm text-cyan">{group.currency}</h3><p className="text-xl font-semibold tabular-nums">{formatMinorAmount(group.valueMinor, group.currency)}</p></div><p className="mt-2 text-xs text-muted-foreground">{group.count} deal{group.count === 1 ? "" : "s"} · {group.unvaluedCount} without a recorded value</p></article>)}{groups.length === 0 ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}</div></Card>;
}

export function MethodologyNote({ children }: { children: React.ReactNode }) {
  return <aside className="mt-8 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground"><h2 className="font-semibold text-foreground">How to read this report</h2><div className="mt-2">{children}</div></aside>;
}
