import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TemplateForm } from "@/components/forms/campaign-forms";
import { canPrepareCampaign, listCampaignTemplates } from "@/server/campaigns/service";
import { getWorkspaceContext } from "@/server/workspaces/context";
export const metadata = { title: "Campaign templates" };
export default async function TemplatesPage() {
  const { scope } = await getWorkspaceContext("read"); const rows = await listCampaignTemplates(scope);
  return <main className="mx-auto max-w-7xl px-5 py-10"><Link className="text-sm text-primary" href="/app/campaigns">Back to campaigns</Link><h1 className="mt-5 text-3xl font-semibold">Message templates</h1><div className="mt-8 grid gap-6 lg:grid-cols-2">{canPrepareCampaign(scope) ? <Card className="self-start p-6"><h2 className="mb-5 font-semibold">New immutable template</h2><TemplateForm /></Card> : null}<div className="grid content-start gap-4">{rows.map((row) => <Card className="p-6" key={row.id}><h2 className="font-semibold">{row.name}</h2><p className="mt-3 text-sm font-medium">{row.subject}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{row.body}</p></Card>)}{!rows.length ? <Card className="p-6 text-sm text-muted-foreground">No templates saved yet.</Card> : null}</div></div></main>;
}
