import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listCrmActivities } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "CRM activity" };
export default async function ActivityPage() { const { scope } = await getWorkspaceContext("read"); const rows = await listCrmActivities(scope); return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">CRM history</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Activity</h1><p className="mt-3 text-muted-foreground">A bounded, append-only operating timeline. Security-sensitive metadata is also recorded in the audit log.</p><Card className="mt-8 p-6"><div className="grid gap-5">{rows.map((row) => <article className="border-l border-border pl-5" key={row.id}><Link className="font-medium hover:text-primary" href={`/app/leads/${row.leadId}`}>{row.companyName}</Link><p className="mt-1 text-sm">{row.summary}</p><p className="mt-2 text-xs text-muted-foreground">{row.actorName ?? row.actorEmail} · {row.occurredAt.toLocaleString("en-ZA")}</p></article>)}{rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No CRM activity yet.</p> : null}</div></Card></main>; }
