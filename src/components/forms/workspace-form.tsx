"use client";

import { useActionState } from "react";
import { createWorkspaceAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function WorkspaceForm() {
  const [state, action] = useActionState(createWorkspaceAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input autoComplete="organization" id="workspace-name" maxLength={80} name="name" placeholder="Cape Code Studio" required />
        <p className="text-xs text-muted-foreground">Usually your agency, studio, or independent business name.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating workspace…">Create workspace</SubmitButton>
    </form>
  );
}
