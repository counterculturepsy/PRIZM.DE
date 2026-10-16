"use client";

import { useActionState } from "react";
import { queueWebsiteAuditAction } from "@/app/app/audits/actions";
import type { FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Label, selectClassName } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function AuditRequestForm({ companies, selectedCompanyId }: { companies: readonly { id: string; name: string; website: string | null }[]; selectedCompanyId?: string | undefined }) {
  const [state, action] = useActionState(queueWebsiteAuditAction, initialState);
  const eligible = companies.filter((company): company is { id: string; name: string; website: string } => Boolean(company.website));
  return <form action={action} className="grid gap-5">
    <div className="grid gap-2"><Label htmlFor="audit-company">Company website</Label><select className={selectClassName} defaultValue={selectedCompanyId ?? ""} id="audit-company" name="companyId" required><option disabled value="">Select a company</option>{eligible.map((company) => <option key={company.id} value={company.id}>{company.name} — {company.website}</option>)}</select></div>
    <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-6"><input className="mt-1 size-4 accent-primary" name="authorization" required type="checkbox" /><span>I confirm this is a public company website and this workspace is authorized to request a bounded, non-authenticated review. The audit will respect robots policy and will not follow links or submit forms.</span></label>
    <FormMessage state={state} />
    <SubmitButton pendingLabel="Queueing audit…">Queue website audit</SubmitButton>
    {eligible.length === 0 ? <p className="text-sm text-muted-foreground">Import or update a company with a public website before requesting an audit.</p> : null}
  </form>;
}
