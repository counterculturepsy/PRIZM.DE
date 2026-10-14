"use client";

import { useActionState } from "react";
import { inviteMemberAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label, selectClassName } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function InviteForm() {
  const [state, action] = useActionState(inviteMemberAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="grid gap-2"><Label htmlFor="invite-email">Work email</Label><Input id="invite-email" name="email" required type="email" /></div>
        <div className="grid gap-2">
          <Label htmlFor="invite-role">Role</Label>
          <select className={selectClassName} defaultValue="viewer" id="invite-role" name="role">
            <option value="admin">Admin</option><option value="sales">Sales</option><option value="developer">Developer</option><option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
      <FormMessage state={state} />
      {state.inviteUrl ? <div className="rounded-lg border border-success/30 bg-success/10 p-3"><p className="text-xs text-muted-foreground">Private invitation link</p><p className="mt-1 break-all font-mono text-xs text-success">{state.inviteUrl}</p></div> : null}
      <SubmitButton pendingLabel="Creating invitation…">Create invitation</SubmitButton>
    </form>
  );
}
