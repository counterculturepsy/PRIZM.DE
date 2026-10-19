"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/app/actions";
import { createCampaignAction, createTemplateAction, enrollRecipientAction, removeEnrollmentAction, removeStepAction, reviewCampaignAction, saveStepAction } from "@/app/app/campaigns/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Input, Label, selectClassName, Textarea } from "@/components/ui/form-controls";
const initial: FormState = { status: "idle" };
export function RemoveStepForm({ campaignId, stepId }: { campaignId: string; stepId: string }) {
  const [state, action] = useActionState(removeStepAction, initial);
  return <form action={action} className="mt-3 grid gap-2"><input type="hidden" name="campaignId" value={campaignId} /><input type="hidden" name="stepId" value={stepId} /><SubmitButton>Remove step</SubmitButton><FormMessage state={state} /></form>;
}
export function RemoveEnrollmentForm({ campaignId, recipientId }: { campaignId: string; recipientId: string }) {
  const [state, action] = useActionState(removeEnrollmentAction, initial);
  return <form action={action} className="mt-3 grid gap-2"><input type="hidden" name="campaignId" value={campaignId} /><input type="hidden" name="recipientId" value={recipientId} /><SubmitButton>Remove enrollment</SubmitButton><FormMessage state={state} /></form>;
}

export function CampaignForm({ requestKey }: { requestKey: string }) {
  const [state, action] = useActionState(createCampaignAction, initial);
  return <form action={action} className="grid gap-4"><input name="requestKey" type="hidden" value={requestKey} /><div className="grid gap-2"><Label htmlFor="campaign-name">Campaign name</Label><Input id="campaign-name" name="name" minLength={2} maxLength={120} required /></div><div className="grid gap-2"><Label htmlFor="campaign-cap">Daily recipient cap</Label><Input id="campaign-cap" name="dailyRecipientCap" type="number" min={1} max={100} defaultValue={10} required /></div><FormMessage state={state} /><SubmitButton>Create campaign draft</SubmitButton></form>;
}
export function TemplateForm() {
  const [state, action] = useActionState(createTemplateAction, initial);
  return <form action={action} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="template-name">Template name</Label><Input id="template-name" name="name" minLength={2} maxLength={100} required /></div><div className="grid gap-2"><Label htmlFor="template-subject">Subject</Label><Input id="template-subject" name="subject" minLength={2} maxLength={200} required /></div><div className="grid gap-2"><Label htmlFor="template-body">Plain-text message</Label><Textarea id="template-body" name="body" minLength={10} maxLength={5000} required /></div><p className="text-xs text-muted-foreground">Saved templates are immutable. Create another template to change wording. Content is displayed as text; placeholders are not expanded.</p><FormMessage state={state} /><SubmitButton>Save template</SubmitButton></form>;
}
export function StepForm({ campaignId, templates }: { campaignId: string; templates: readonly { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveStepAction, initial);
  return <form action={action} className="grid gap-4"><input name="campaignId" type="hidden" value={campaignId} /><div className="grid gap-2"><Label htmlFor="step-template">Template</Label><select id="step-template" name="templateId" className={selectClassName} required><option value="">Choose template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="step-position">Position (1–10)</Label><Input id="step-position" name="position" type="number" min={1} max={10} defaultValue={1} required /></div><div className="grid gap-2"><Label htmlFor="step-delay">Days from enrollment</Label><Input id="step-delay" name="delayDays" type="number" min={0} max={90} defaultValue={0} required /></div></div><p className="text-xs text-muted-foreground">Saving an existing position replaces that step. Delays are cumulative, starting at enrollment.</p><FormMessage state={state} /><SubmitButton>Save sequence step</SubmitButton></form>;
}
export function RecipientForm({ campaignId, contacts }: { campaignId: string; contacts: readonly { id: string; firstName: string; companyName: string; email: string | null }[] }) {
  const [state, action] = useActionState(enrollRecipientAction, initial);
  return <form action={action} className="grid gap-4"><input name="campaignId" type="hidden" value={campaignId} /><div className="grid gap-2"><Label htmlFor="recipient-contact">Business contact</Label><select id="recipient-contact" name="contactId" className={selectClassName} required><option value="">Choose contact</option>{contacts.filter((c) => c.email).map((c) => <option key={c.id} value={c.id}>{c.firstName} · {c.companyName}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="recipient-basis">Documented permission or contact-use basis</Label><Textarea id="recipient-basis" name="contactBasis" minLength={10} maxLength={500} required /></div><p className="text-xs text-muted-foreground">Record why this business contact may be considered. Enrollment does not establish legal permission or send a message. Suppression is enforced server-side.</p><FormMessage state={state} /><SubmitButton>Enroll for preparation</SubmitButton></form>;
}
export function CampaignReviewForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useActionState(reviewCampaignAction, initial);
  return <form action={action} className="grid gap-4"><input name="campaignId" type="hidden" value={campaignId} /><Label htmlFor="campaign-review">Human review note</Label><Textarea id="campaign-review" name="note" minLength={10} maxLength={1000} required /><FormMessage state={state} /><SubmitButton>Record preparation review</SubmitButton></form>;
}
