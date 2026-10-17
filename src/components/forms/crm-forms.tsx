"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/app/actions";
import {
  addCrmContactAction,
  addCrmNoteAction,
  addCrmTaskAction,
  changeDealStageAction,
  completeCrmTaskAction,
  createCrmLeadAction,
  suppressCrmContactAction,
} from "@/app/app/crm/actions";
import { dealStages } from "@/modules/crm/validation";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Input, Label, selectClassName, Textarea } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function CreateLeadForm({ companies }: { companies: readonly { id: string; name: string; industry: string | null; city: string | null }[] }) {
  const [state, action] = useActionState(createCrmLeadAction, initialState);
  return <form action={action} className="grid gap-4">
    <div className="grid gap-2"><Label htmlFor="lead-company">Company</Label><select className={selectClassName} id="lead-company" name="companyId" required><option value="">Select a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.city ? ` — ${company.city}` : ""}</option>)}</select></div>
    <div className="grid gap-2"><Label htmlFor="lead-title">Lead title</Label><Input id="lead-title" maxLength={160} name="title" placeholder="Website modernization opportunity" required /></div>
    <FormMessage state={state} /><SubmitButton pendingLabel="Creating lead…">Create CRM lead</SubmitButton>
    {companies.length === 0 ? <p className="text-sm text-muted-foreground">Every imported company already has a lead, or no companies have been imported yet.</p> : null}
  </form>;
}

export function CreateLeadFromOpportunityForm({ companyId, opportunityId, title }: { companyId: string; opportunityId: string; title: string }) {
  const [state, action] = useActionState(createCrmLeadAction, initialState);
  return <form action={action} className="grid gap-2"><input name="companyId" type="hidden" value={companyId} /><input name="sourceOpportunityId" type="hidden" value={opportunityId} /><input name="title" type="hidden" value={title} /><SubmitButton pendingLabel="Creating lead…">Create CRM lead</SubmitButton><FormMessage state={state} /></form>;
}

export function DealStageForm({ leadId, currentStage }: { leadId: string; currentStage: string }) {
  const [state, action] = useActionState(changeDealStageAction, initialState);
  return <form action={action} className="grid gap-4"><input name="leadId" type="hidden" value={leadId} />
    <div className="grid gap-2"><Label htmlFor="deal-stage">Pipeline stage</Label><select className={selectClassName} defaultValue={currentStage} id="deal-stage" name="stage">{dealStages.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}</select></div>
    <div className="grid gap-2"><Label htmlFor="lost-reason">Loss reason <span className="text-muted-foreground">(required only for Lost)</span></Label><Input id="lost-reason" maxLength={500} name="lostReason" /></div>
    <FormMessage state={state} /><SubmitButton pendingLabel="Updating…">Update stage</SubmitButton>
  </form>;
}

export function ContactForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(addCrmContactAction, initialState);
  return <form action={action} className="grid gap-4"><input name="leadId" type="hidden" value={leadId} />
    <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="contact-first">First name</Label><Input id="contact-first" maxLength={80} name="firstName" required /></div><div className="grid gap-2"><Label htmlFor="contact-last">Last name</Label><Input id="contact-last" maxLength={80} name="lastName" /></div></div>
    <div className="grid gap-2"><Label htmlFor="contact-role">Role or title</Label><Input id="contact-role" maxLength={120} name="roleTitle" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="contact-email">Business email</Label><Input id="contact-email" maxLength={254} name="email" type="email" /></div><div className="grid gap-2"><Label htmlFor="contact-phone">Business phone</Label><Input id="contact-phone" maxLength={40} name="phone" type="tel" /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="contact-source-kind">Source type</Label><select className={selectClassName} defaultValue="user_supplied" id="contact-source-kind" name="sourceKind"><option value="user_supplied">User supplied</option><option value="observed">Observed public business detail</option></select></div><div className="grid gap-2"><Label htmlFor="contact-confidence">Confidence</Label><select className={selectClassName} defaultValue="medium" id="contact-confidence" name="confidence"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div>
    <div className="grid gap-2"><Label htmlFor="contact-source">Source label</Label><Input id="contact-source" maxLength={160} name="sourceLabel" placeholder="Client referral or company contact page" required /></div>
    <div className="grid gap-2"><Label htmlFor="contact-source-url">Source URL <span className="text-muted-foreground">(optional)</span></Label><Input id="contact-source-url" maxLength={2048} name="sourceUrl" type="url" /></div>
    <p className="text-xs leading-5 text-muted-foreground">Store only legitimate business contact details. A source record is not proof of consent or permission to send outreach.</p>
    <FormMessage state={state} /><SubmitButton pendingLabel="Adding contact…">Add attributed contact</SubmitButton>
  </form>;
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(addCrmNoteAction, initialState);
  return <form action={action} className="grid gap-3"><input name="leadId" type="hidden" value={leadId} /><Label htmlFor="note-body">New note</Label><Textarea id="note-body" maxLength={2000} name="body" required /><FormMessage state={state} /><SubmitButton pendingLabel="Adding note…">Add note</SubmitButton></form>;
}

export function TaskForm({ leadId, members }: { leadId: string; members: readonly { userId: string; name: string | null; email: string }[] }) {
  const [state, action] = useActionState(addCrmTaskAction, initialState);
  return <form action={action} className="grid gap-4"><input name="leadId" type="hidden" value={leadId} /><div className="grid gap-2"><Label htmlFor="task-title">Task</Label><Input id="task-title" maxLength={160} name="title" required /></div><div className="grid gap-2"><Label htmlFor="task-description">Description</Label><Textarea id="task-description" maxLength={1000} name="description" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="task-due">Due</Label><Input id="task-due" name="dueAt" type="datetime-local" /></div><div className="grid gap-2"><Label htmlFor="task-assignee">Assignee</Label><select className={selectClassName} id="task-assignee" name="assignedToUserId"><option value="">Unassigned</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name ?? member.email}</option>)}</select></div></div><FormMessage state={state} /><SubmitButton pendingLabel="Adding task…">Add follow-up</SubmitButton></form>;
}

export function CompleteTaskForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(completeCrmTaskAction, initialState);
  return <form action={action} className="grid gap-2"><input name="taskId" type="hidden" value={taskId} /><SubmitButton pendingLabel="Completing…">Mark complete</SubmitButton><FormMessage state={state} /></form>;
}

export function SuppressContactForm({ leadId, contactId, hasEmail, hasPhone }: { leadId: string; contactId: string; hasEmail: boolean; hasPhone: boolean }) {
  const [state, action] = useActionState(suppressCrmContactAction, initialState);
  return <form action={action} className="grid gap-3 rounded-xl border border-border bg-background p-3"><input name="leadId" type="hidden" value={leadId} /><input name="contactId" type="hidden" value={contactId} /><Label htmlFor={`suppress-channel-${contactId}`}>Do-not-contact channel</Label><select className={selectClassName} id={`suppress-channel-${contactId}`} name="channel">{hasEmail ? <option value="email">Email</option> : null}{hasPhone ? <option value="phone">Phone</option> : null}</select><Label htmlFor={`suppress-reason-${contactId}`}>Reason</Label><Input id={`suppress-reason-${contactId}`} maxLength={500} name="reason" placeholder="Opt-out request or policy decision" required /><FormMessage state={state} /><SubmitButton pendingLabel="Recording…">Record suppression</SubmitButton></form>;
}
