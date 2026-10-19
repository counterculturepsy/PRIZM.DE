import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listCampaigns } from "@/server/campaigns/service";
import { getWorkspaceContext } from "@/server/workspaces/context";
export const metadata = { title: "Campaign sequences" };
export default async function SequencesPage() {
  const { scope } = await getWorkspaceContext("read"); const rows = await listCampaigns(scope);
  return <main className="mx-auto max-w-5xl px-5 py-10"><Link className="text-sm text-primary" href="/app/campaigns">Back to campaigns</Link><h1 className="mt-5 text-3xl font-semibold">Sequence plans</h1><p className="mt-3 text-muted-foreground">Open a campaign to set ordered steps and cumulative delays. Sequences are plans; scheduling and delivery are disabled.</p><div className="mt-8 grid gap-4">{rows.map((row) => <Link key={row.id} href={`/app/campaigns/${row.id}`}><Card className="p-5 hover:border-primary">{row.name}<span className="ml-3 text-xs text-muted-foreground">{row.status}</span></Card></Link>)}{!rows.length ? <Card className="p-6 text-sm text-muted-foreground">Create a campaign before adding sequence steps.</Card> : null}</div></main>;
}
