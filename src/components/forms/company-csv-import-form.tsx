"use client";

import { useActionState } from "react";
import { importCompanyCsvAction } from "@/app/app/discover/actions";
import type { FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Input, Label } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function CompanyCsvImportForm() {
  const [state, action] = useActionState(importCompanyCsvAction, initialState);
  return <form action={action} className="grid gap-4">
    <div className="grid gap-2"><Label htmlFor="company-csv">Company CSV</Label><Input accept=".csv,text/csv" id="company-csv" name="file" required type="file" /></div>
    <p className="text-xs leading-5 text-muted-foreground">Up to 1 MB and 500 rows. <strong className="text-foreground">name</strong> is required. Optional columns include website, industry, city, province, phone, email, source_url, and external_id.</p>
    <FormMessage state={state} />
    <SubmitButton pendingLabel="Importing…">Import companies</SubmitButton>
  </form>;
}
