"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/app/actions";
import { generateDraftAction, reviewDraftAction, saveAiPolicyAction } from "@/app/app/ai/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Input, Label, selectClassName, Textarea } from "@/components/ui/form-controls";

const initial: FormState = { status: "idle" };

export function GenerateDraftForm({ leads, purpose, requestKey, available }: { leads: readonly { id: string; title: string }[]; purpose: "strategy" | "outreach"; requestKey: string; available: boolean }) {
  const [state, action] = useActionState(generateDraftAction, initial);
  return <form action={action} className="grid gap-5"><input name="purpose" type="hidden" value={purpose} /><input name="requestKey" type="hidden" value={requestKey} />
    <div className="grid gap-2"><Label htmlFor="ai-lead">CRM lead</Label><select className={selectClassName} id="ai-lead" name="leadId" required><option value="">Choose a lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title}</option>)}</select></div>
    <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm leading-6"><input className="mt-1 size-4 accent-primary" name="acknowledged" required type="checkbox" /><span>I approve sending the selected lead&apos;s redacted audit evidence to the configured AI provider. I will check the draft&apos;s facts, citations, and permission for use before reviewing it.</span></label>
    <FormMessage state={state} />{available ? <SubmitButton pendingLabel="Generating draft…">Generate {purpose} draft</SubmitButton> : <p role="status" className="rounded-lg bg-warning/10 p-4 text-sm text-warning">AI drafting is disabled. A workspace administrator must enable the policy and an operator must configure the provider.</p>}
    <p className="text-xs leading-5 text-muted-foreground">Only audit findings enter the prompt. Requests count against your UTC daily limit, including provider failures. Generation can take up to 45 seconds.</p>
  </form>;
}

export function ReviewDraftForm({ id }: { id: string }) {
  const [state, action] = useActionState(reviewDraftAction, initial);
  return <form action={action} className="grid gap-4"><input name="draftId" type="hidden" value={id} /><div className="grid gap-2"><Label htmlFor="review-decision">Decision</Label><select className={selectClassName} id="review-decision" name="decision"><option value="rejected">Reject</option><option value="approved">Approve after factual review</option></select></div><div className="grid gap-2"><Label htmlFor="review-note">Review note</Label><Textarea id="review-note" name="note" maxLength={1000} minLength={2} required /></div><p className="text-xs text-muted-foreground">Approval records your review. Sending is unavailable.</p><FormMessage state={state} /><SubmitButton>Record review</SubmitButton></form>;
}

export function AiPolicyForm({ enabled, dailyRequestLimit }: { enabled: boolean; dailyRequestLimit: number }) {
  const [state, action] = useActionState(saveAiPolicyAction, initial);
  return <form action={action} className="grid gap-5"><label className="flex items-center gap-3 text-sm"><input className="size-4 accent-primary" defaultChecked={enabled} name="enabled" type="checkbox" />Enable AI drafting for this workspace</label><div className="grid gap-2"><Label htmlFor="ai-limit">Daily request limit (UTC)</Label><Input defaultValue={dailyRequestLimit} id="ai-limit" min={1} max={100} name="dailyRequestLimit" required type="number" /></div><p className="text-xs leading-5 text-muted-foreground">Each request is limited to 2,000 output tokens. Request limits constrain use; actual provider charges depend on your model. Keys are managed in the server environment.</p><FormMessage state={state} /><SubmitButton>Save AI policy</SubmitButton></form>;
}
