import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { CompleteTaskForm, ContactForm, DealStageForm, NoteForm, SuppressContactForm, TaskForm } from "@/components/forms/crm-forms";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { getCrmLead, listActiveWorkspaceMembers } from "@/server/crm/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Lead workspace" };

export default async function LeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { scope } = await getWorkspaceContext("read");
  const { leadId } = await params;
  const [lead, members] = await Promise.all([getCrmLead(scope, leadId), listActiveWorkspaceMembers(scope)]);
  if (!lead) notFound();
  const canWrite = hasCapability(scope, "write");
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
    <Link className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" href="/app/leads"><ArrowLeft className="mr-2 size-4" />Back to leads</Link>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Lead workspace</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{lead.title}</h1><p className="mt-3 text-muted-foreground">{lead.companyName}{[lead.industry, lead.city].filter(Boolean).length ? ` · ${[lead.industry, lead.city].filter(Boolean).join(" · ")}` : ""}</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm capitalize text-primary">{lead.stage}</span></div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="grid content-start gap-6"><Card className="p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Contacts</h2><span className="font-mono text-xs text-muted-foreground">{lead.contacts.length}</span></div>{lead.contacts.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No contacts recorded. Add only legitimate business contact details with a source.</p> : <div className="mt-5 grid gap-4">{lead.contacts.map((contact) => <article className="rounded-xl border border-border p-4" key={contact.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{contact.firstName} {contact.lastName}</h3><p className="text-sm text-muted-foreground">{contact.roleTitle ?? "Role not supplied"}</p></div>{contact.doNotContact ? <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-1 text-xs text-error"><ShieldAlert className="mr-1.5 size-3.5" />Do not contact</span> : null}</div><dl className="mt-4 grid gap-2 text-sm"><div><dt className="inline text-muted-foreground">Email: </dt><dd className="inline">{contact.email ?? "Not supplied"}</dd></div><div><dt className="inline text-muted-foreground">Phone: </dt><dd className="inline">{contact.phone ?? "Not supplied"}</dd></div><div><dt className="inline text-muted-foreground">Source: </dt><dd className="inline">{contact.sourceLabel} · {contact.sourceKind.replace("_", " ")} · {contact.confidence}</dd></div></dl>{canWrite && !contact.doNotContact ? <div className="mt-4"><SuppressContactForm contactId={contact.id} hasEmail={Boolean(contact.email)} hasPhone={Boolean(contact.phone)} leadId={lead.id} /></div> : null}</article>)}</div>}</Card>
        {canWrite ? <Card className="p-6"><h2 className="mb-5 text-lg font-semibold">Add contact</h2><ContactForm leadId={lead.id} /></Card> : null}
        <Card className="p-6"><h2 className="text-lg font-semibold">Notes</h2>{canWrite ? <div className="mt-5"><NoteForm leadId={lead.id} /></div> : null}<div className="mt-6 grid gap-3">{lead.notes.map((note) => <article className="rounded-xl bg-background p-4" key={note.id}><p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p><p className="mt-3 text-xs text-muted-foreground">{note.authorName ?? note.authorEmail} · {note.createdAt.toLocaleString("en-ZA")}</p></article>)}{lead.notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}</div></Card>
      </div>
      <aside className="grid content-start gap-6"><Card className="p-6"><h2 className="text-lg font-semibold">Pipeline</h2><p className="mt-2 text-sm text-muted-foreground">Stage changes are recorded in the activity and security audit logs.</p>{canWrite ? <div className="mt-5"><DealStageForm currentStage={lead.stage} leadId={lead.id} /></div> : null}</Card>
        <Card className="p-6"><h2 className="text-lg font-semibold">Follow-ups</h2>{canWrite ? <div className="mt-5"><TaskForm leadId={lead.id} members={members} /></div> : null}<div className="mt-6 grid gap-3">{lead.tasks.map((task) => <article className="rounded-xl border border-border p-4" key={task.id}><div className="flex items-start gap-3">{task.status === "completed" ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <Circle className="mt-0.5 size-4 text-muted-foreground" />}<div className="min-w-0"><h3 className="text-sm font-medium">{task.title}</h3>{task.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p> : null}<p className="mt-2 text-xs text-muted-foreground">{task.dueAt ? `Due ${task.dueAt.toLocaleString("en-ZA")}` : "No due date"} · {task.status}</p></div></div>{canWrite && task.status === "open" ? <div className="mt-3"><CompleteTaskForm taskId={task.id} /></div> : null}</article>)}{lead.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No follow-up tasks.</p> : null}</div></Card>
        <Card className="p-6"><h2 className="text-lg font-semibold">Activity</h2><div className="mt-5 grid gap-4">{lead.activities.map((activity) => <div className="border-l border-border pl-4" key={activity.id}><p className="text-sm">{activity.summary}</p><p className="mt-1 text-xs text-muted-foreground">{activity.actorName ?? activity.actorEmail} · {activity.occurredAt.toLocaleString("en-ZA")}</p></div>)}</div></Card>
      </aside>
    </div>
  </main>;
}
