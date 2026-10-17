import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { dealStages } from "@/modules/crm/validation";
import { listCrmLeads } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "CRM pipeline" };

export default async function PipelinePage() {
  const { scope } = await getWorkspaceContext("read");
  const rows = await listCrmLeads(scope);
  return <main className="mx-auto max-w-[1600px] px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">M5 · CRM</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Deal pipeline</h1><p className="mt-3 max-w-3xl text-muted-foreground">A stage-based operating view. Pipeline state is internal planning data, not a forecast guarantee.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{dealStages.map((stage) => { const stageRows = rows.filter((row) => row.stage === stage); return <section className="min-w-0" key={stage}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold capitalize">{stage}</h2><span className="font-mono text-xs text-muted-foreground">{stageRows.length}</span></div><div className="grid gap-3">{stageRows.map((row) => <Link href={`/app/leads/${row.id}`} key={row.id}><Card className="p-4 transition-colors hover:border-primary"><h3 className="text-sm font-medium">{row.companyName}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{row.title}</p></Card></Link>)}{stageRows.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No deals</div> : null}</div></section>; })}</div></main>;
}
