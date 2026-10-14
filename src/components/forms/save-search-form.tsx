"use client";

import { useActionState } from "react";
import { saveCompanySearchAction } from "@/app/app/discover/actions";
import type { FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "@/components/forms/form-parts";
import { Input, Label } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function SaveSearchForm({ filters }: { filters: Readonly<{ q?: string; industry?: string; city?: string; province?: string }> }) {
  const [state, action] = useActionState(saveCompanySearchAction, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
    {Object.entries(filters).map(([name, value]) => value ? <input key={name} name={name} type="hidden" value={value} /> : null)}
    <div className="grid gap-2"><Label htmlFor="search-name">Saved search name</Label><Input id="search-name" maxLength={80} name="name" placeholder="Gauteng creative studios" required /></div>
    <SubmitButton>Save current filters</SubmitButton>
    <div className="sm:col-span-2"><FormMessage state={state} /></div>
  </form>;
}
