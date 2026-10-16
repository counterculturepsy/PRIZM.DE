import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { AuditRequestForm } from "@/components/forms/audit-request-form";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { listAuditCandidates, listWebsiteAudits } from "@/server/audits/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Website audits" };

function first(value: string | string[] | undefined): string | undefined { return typeof value === "string" ? value : undefined; }

export default async function WebsiteAuditsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { scope } = await getWorkspaceContext("read");
  const params = await searchParams;
  const [audits, companies] = await Promise.all([listWebsiteAudits(scope), listAuditCandidates(scope)]);
  const canWrite = hasCapability(scope, "write");
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Evidence workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Website audits</h1><p className="mt-3 max-w-3xl text-muted-foreground">Queue a bounded static review and keep observed evidence separate from future recommendations. Processing remains disabled until the worker environment is explicitly approved and configured.</p></div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.15fr]">{canWrite ? <Card className="p-6"><div className="mb-6 flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-semibold">Request an authorized review</h2></div><AuditRequestForm companies={companies} selectedCompanyId={first(params.companyId)} /></Card> : <Card className="p-6"><h2 className="font-semibold">Read-only access</h2><p className="mt-2 text-sm text-muted-foreground">Your workspace role can view reports but cannot queue audits.</p></Card>}
      <Card className="p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Audit history</h2><span className="font-mono text-xs text-muted-foreground">{audits.length} total</span></div>{audits.length === 0 ? <div className="py-12 text-center"><Activity className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">No website audits have been requested.</p></div> : <div className="mt-5 grid gap-3">{audits.map((audit) => <Link className="group rounded-xl border border-border p-4 transition-colors hover:border-primary" href={`/app/audits/${audit.id}`} key={audit.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium group-hover:text-primary">{audit.companyName}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{audit.url}</p></div><ArrowRight className="size-4 text-muted-foreground" /></div><div className="mt-4 flex items-center justify-between text-xs"><span className="rounded-full bg-muted px-2.5 py-1 capitalize">{audit.status}</span><span className="font-mono text-muted-foreground">{audit.score === null ? "Score pending" : `${audit.score}/100`}</span></div></Link>)}</div>}</Card></div>
  </main>;
}
