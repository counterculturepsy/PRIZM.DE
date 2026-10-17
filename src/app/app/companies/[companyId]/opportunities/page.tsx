import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCompanyOpportunityIntelligence } from "@/server/opportunities/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Company opportunities" };

function price(minimum: number | null, maximum: number | null, currency: string | null) {
  if (!currency || (minimum === null && maximum === null)) return null;
  const format = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
  if (minimum !== null && maximum !== null) return `${format(minimum)}–${format(maximum)}`;
  return minimum !== null ? `From ${format(minimum)}` : `Typical ${format(maximum!)}`;
}

export default async function CompanyOpportunitiesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { scope } = await getWorkspaceContext("read");
  const { companyId } = await params;
  const result = await getCompanyOpportunityIntelligence(scope, companyId);
  if (!result) notFound();
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <Link className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" href="/app/discover/opportunities"><ArrowLeft className="mr-2 size-4" />Back to opportunities</Link>
    <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_0.75fr]"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Opportunity report</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{result.companyName}</h1><p className="mt-3 text-muted-foreground">{[result.industry, result.city].filter(Boolean).join(" · ") || "Company profile details not supplied"}</p><div className="mt-8 grid gap-5">{result.opportunities.map(({ opportunity, evidence }) => {
      const guidance = price(opportunity.estimatedValueMinMinor, opportunity.estimatedValueMaxMinor, opportunity.currency);
      return <Card className="p-6" key={opportunity.opportunityId}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs capitalize text-primary">{opportunity.type.replaceAll("_", " ")}</span><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{opportunity.confidence} confidence</span></div><h2 className="mt-4 text-xl font-semibold">{opportunity.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{opportunity.summary}</p><h3 className="mt-5 text-sm font-semibold">Potential business impact</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{opportunity.businessImpact}</p><h3 className="mt-5 text-sm font-semibold">Recommended next step</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{opportunity.recommendedSolution}</p>{guidance ? <p className="mt-5 rounded-lg bg-background p-3 font-mono text-sm text-cyan">Configured catalogue guidance: {guidance}</p> : null}<div className="mt-6 border-t border-border pt-5"><h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Source evidence</h3><div className="mt-3 grid gap-3">{evidence.map((item) => <div className="rounded-lg bg-background p-4" key={item.findingId}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{item.findingTitle}</p><span className="text-xs capitalize text-muted-foreground">{item.findingCategory}</span></div><p className="mt-2 text-sm text-muted-foreground">{item.findingEvidence}</p><p className="mt-2 text-xs text-muted-foreground">Observed {item.findingObservedAt.toLocaleString("en-ZA")}</p></div>)}</div></div></Card>;
    })}</div></div><aside><Card className="p-6 text-center"><p className="text-xs uppercase tracking-wide text-muted-foreground">Opportunity score</p><p className="mt-2 font-mono text-5xl font-semibold">{result.totalScore}</p><p className="mt-1 text-xs text-muted-foreground">out of 100 · {result.priority}</p><p className="mt-4 text-xs leading-5 text-muted-foreground">Higher means stronger observed opportunity under {result.scoringVersion}; it is not a sales probability.</p></Card><Card className="mt-4 p-6"><h2 className="font-semibold">Score explanation</h2><dl className="mt-4 grid gap-4">{result.components.map((component) => <div key={component.key}><div className="flex items-center justify-between gap-3"><dt className="text-sm font-medium">{component.label}</dt><dd className="font-mono text-sm">{component.points}/{component.maxPoints}</dd></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{component.reason}</p></div>)}</dl></Card><Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:border-primary" href={`/app/audits/${result.auditId}`}>Open source audit <ExternalLink className="ml-2 size-4" /></Link><p className="mt-4 text-xs leading-5 text-muted-foreground">Validate the evidence, business context, lawful basis, and final scope before using this report for a sales decision.</p></aside></div>
  </main>;
}
