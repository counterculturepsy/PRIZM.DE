import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { CreateLeadForm } from "@/components/forms/crm-forms";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { listCrmLeads, listLeadCandidates } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "CRM leads" };

export default async function LeadsPage() {
  const { scope } = await getWorkspaceContext("read");
  const [rows, candidates] = await Promise.all([listCrmLeads(scope), listLeadCandidates(scope)]);
  const canWrite = hasCapability(scope, "write");
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">M5 · CRM</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Leads</h1><p className="mt-3 max-w-3xl text-muted-foreground">Manage tenant-owned sales work without triggering outreach. Contact provenance, tasks, activity, and pipeline state stay visible.</p></div><Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:border-primary" href="/app/crm/pipeline">Open pipeline</Link></div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.4fr]">{canWrite ? <Card className="p-6"><h2 className="text-lg font-semibold">Create a lead</h2><p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">Choose an imported company. PRIZM creates one lead and one deal per company.</p><CreateLeadForm companies={candidates} /></Card> : <Card className="p-6"><h2 className="font-semibold">Read-only access</h2><p className="mt-2 text-sm text-muted-foreground">Your role can review CRM records but cannot create or change them.</p></Card>}
      <Card className="p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Lead workspace</h2><span className="font-mono text-xs text-muted-foreground">{rows.length} leads</span></div>{rows.length === 0 ? <div className="py-12 text-center"><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">No CRM leads yet.</p></div> : <div className="mt-5 grid gap-3">{rows.map((row) => <Link className="group rounded-xl border border-border p-4 transition-colors hover:border-primary" href={`/app/leads/${row.id}`} key={row.id}><div className="flex items-start justify-between gap-4"><div><h3 className="font-medium group-hover:text-primary">{row.title}</h3><p className="mt-1 text-sm text-muted-foreground">{row.companyName}{row.city ? ` · ${row.city}` : ""}</p></div><ArrowRight className="size-4 text-muted-foreground" /></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-primary/10 px-2.5 py-1 capitalize text-primary">{row.stage}</span><span className="rounded-full bg-muted px-2.5 py-1 capitalize">{row.status}</span>{row.industry ? <span className="text-muted-foreground">{row.industry}</span> : null}</div></Link>)}</div>}</Card>
    </div>
  </main>;
}
