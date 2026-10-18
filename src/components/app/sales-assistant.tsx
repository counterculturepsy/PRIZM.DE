import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GenerateDraftForm } from "@/components/forms/ai-forms";
import { hasCapability } from "@/modules/workspaces/scope";
import { getAiPolicy, listSalesDrafts } from "@/server/ai/service";
import { configuredSalesProvider } from "@/server/ai/provider";
import { listCrmLeads } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export async function SalesAssistant({ purpose }: { purpose: "strategy" | "outreach" }) {
  const { scope } = await getWorkspaceContext("read");
  const [leads, history, policy] = await Promise.all([listCrmLeads(scope), listSalesDrafts(scope, purpose), getAiPolicy(scope)]);
  const configured = configuredSalesProvider();
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-widest text-cyan">Sales assistant</p><h1 className="mt-3 text-3xl font-semibold capitalize">{purpose} drafts</h1><p className="mt-3 max-w-3xl text-muted-foreground">Build a proposed {purpose === "strategy" ? "sales approach" : "message"} from recorded audit evidence, then inspect its sources and record your review.</p><nav aria-label="Sales assistant" className="mt-5 flex flex-wrap gap-4 text-sm text-primary"><Link href="/app/ai/strategy">Strategy</Link><Link href="/app/ai/outreach">Outreach</Link><Link href="/app/settings/ai">AI policy</Link></nav><div className="mt-8 grid gap-6 lg:grid-cols-2"><Card className="p-6"><h2 className="mb-5 text-lg font-semibold">New draft</h2>{hasCapability(scope, "write") ? <GenerateDraftForm available={policy.enabled && configured.provider.id !== "disabled"} leads={leads} purpose={purpose} requestKey={randomUUID()} /> : <p className="text-sm text-muted-foreground">Your role can view drafts. Creating and reviewing drafts requires write access.</p>}</Card><Card className="p-6"><h2 className="text-lg font-semibold">Saved drafts</h2><div className="mt-5 grid gap-3">{history.map((run) => <Link className="rounded-xl border border-border p-4 hover:border-primary" href={`/app/ai/drafts/${run.id}`} key={run.id}><h3 className="font-medium">{run.leadTitle}</h3><p className="mt-2 text-xs text-muted-foreground">{run.status} · Review {run.reviewStatus} · {run.createdAt.toLocaleString("en-ZA")}</p></Link>)}{!history.length ? <p className="py-8 text-sm text-muted-foreground">No drafts saved yet.</p> : null}</div></Card></div></main>;
}
