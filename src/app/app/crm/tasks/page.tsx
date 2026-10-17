import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { CompleteTaskForm } from "@/components/forms/crm-forms";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { listCrmTasks } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "CRM tasks" };
export default async function TasksPage() { const { scope } = await getWorkspaceContext("read"); const rows = await listCrmTasks(scope); const canWrite = hasCapability(scope, "write"); return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">CRM follow-ups</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Tasks</h1><p className="mt-3 text-muted-foreground">Open and completed follow-ups across the active workspace.</p><div className="mt-8 grid gap-3">{rows.map((row) => <Card className="p-5" key={row.id}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3">{row.status === "completed" ? <CheckCircle2 className="mt-0.5 size-5 text-success" /> : <Circle className="mt-0.5 size-5 text-muted-foreground" />}<div><Link className="font-semibold hover:text-primary" href={`/app/leads/${row.leadId}`}>{row.title}</Link><p className="mt-1 text-sm text-muted-foreground">{row.companyName}{row.dueAt ? ` · Due ${row.dueAt.toLocaleString("en-ZA")}` : " · No due date"}</p>{row.description ? <p className="mt-3 text-sm leading-6">{row.description}</p> : null}</div></div>{canWrite && row.status === "open" ? <CompleteTaskForm taskId={row.id} /> : <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{row.status}</span>}</div></Card>)}{rows.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">No follow-up tasks yet.</Card> : null}</div></main>; }
