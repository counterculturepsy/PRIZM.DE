import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CampaignForm } from "@/components/forms/campaign-forms";
import { canPrepareCampaign, listCampaigns } from "@/server/campaigns/service";
import { getWorkspaceContext } from "@/server/workspaces/context";
export const metadata = { title: "Campaign preparation" };
export default async function CampaignsPage() {
  const { scope } = await getWorkspaceContext("read"); const rows = await listCampaigns(scope);
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6"><p className="font-mono text-xs uppercase tracking-widest text-cyan">Campaign preparation</p><h1 className="mt-3 text-3xl font-semibold">Plan your outreach</h1><p className="mt-3 max-w-3xl text-muted-foreground">Prepare content, sequence timing and a reviewed audience. Email delivery is disabled while provider and message-handling integrations are pending.</p><nav aria-label="Campaigns" className="mt-5 flex gap-5 text-sm text-primary"><Link href="/app/campaigns/templates">Templates</Link><Link href="/app/campaigns/sequences">Sequences</Link></nav><div className="mt-8 grid gap-6 lg:grid-cols-2"><Card className="p-6"><h2 className="mb-5 text-lg font-semibold">New campaign</h2>{canPrepareCampaign(scope) ? <CampaignForm requestKey={randomUUID()} /> : <p className="text-sm text-muted-foreground">Your role has read-only campaign access.</p>}</Card><Card className="p-6"><h2 className="text-lg font-semibold">Saved campaigns</h2><div className="mt-5 grid gap-3">{rows.map((row) => <Link className="rounded-xl border border-border p-4 hover:border-primary" href={`/app/campaigns/${row.id}`} key={row.id}><h3 className="font-medium">{row.name}</h3><p className="mt-2 text-xs text-muted-foreground">{row.status} · Cap {row.dailyRecipientCap}/day · Delivery disabled</p></Link>)}{!rows.length ? <p className="py-6 text-sm text-muted-foreground">No campaign drafts yet.</p> : null}</div></Card></div></main>;
}
