import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { listOpportunityFeed } from "@/server/opportunities/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Opportunities" };

const priorityStyle = {
  low: "bg-muted text-muted-foreground",
  possible: "bg-cyan/10 text-cyan",
  good: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  priority: "bg-success/10 text-success",
} as const;

function price(minimum: number | null, maximum: number | null, currency: string | null) {
  if (!currency || (minimum === null && maximum === null)) return null;
  const format = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
  if (minimum !== null && maximum !== null) return `${format(minimum)}–${format(maximum)}`;
  return minimum !== null ? `From ${format(minimum)}` : `Typical ${format(maximum!)}`;
}

export default async function OpportunityFeedPage() {
  const { scope, workspace } = await getWorkspaceContext("read");
  const rows = await listOpportunityFeed(scope);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">M4 · Opportunity intelligence</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Evidence-backed opportunities</h1><p className="mt-3 max-w-3xl text-muted-foreground">Ranked from completed audits and {workspace.name}&apos;s configured ICP. Scores support review; they do not predict a sale or trigger outreach.</p></div><span className="rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">{rows.length} opportunities</span></div>
    {rows.length === 0 ? <Card className="mt-8 p-10 text-center"><Lightbulb className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 font-semibold">No materialized opportunities yet</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Complete a website audit to generate deterministic opportunities. Existing audits can be reprocessed under the M4 rules without contacting the company.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-primary" href="/app/audits">Open audits</Link></Card> : <div className="mt-8 grid gap-4 lg:grid-cols-2">{rows.map((row) => {
      const guidance = price(row.estimatedValueMinMinor, row.estimatedValueMaxMinor, row.currency);
      return <Card className="p-6" key={row.opportunityId}><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityStyle[row.priority]}`}>{row.priority} · {row.totalScore}/100</span><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{row.confidence} confidence</span><span className="ml-auto font-mono text-xs text-muted-foreground">{row.evidenceCount} evidence</span></div><p className="mt-5 text-sm text-muted-foreground">{row.companyName}{row.industry ? ` · ${row.industry}` : ""}{row.city ? ` · ${row.city}` : ""}</p><h2 className="mt-2 text-xl font-semibold">{row.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{row.summary}</p>{guidance ? <p className="mt-4 font-mono text-sm text-cyan">Catalogue guidance: {guidance}</p> : <p className="mt-4 text-xs text-muted-foreground">No matching configured service price.</p>}<Link className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href={`/app/companies/${row.companyId}/opportunities`}>Review evidence <ArrowRight className="ml-2 size-4" /></Link></Card>;
    })}</div>}
  </main>;
}
