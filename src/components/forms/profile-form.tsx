"use client";

import { useActionState } from "react";
import { updateProfileAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function ProfileForm({ name, jobTitle, email }: { name: string; jobTitle: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2"><Label htmlFor="profile-name">Name</Label><Input defaultValue={name} id="profile-name" maxLength={80} name="name" required /></div>
      <div className="grid gap-2"><Label htmlFor="profile-title">Job title</Label><Input defaultValue={jobTitle} id="profile-title" maxLength={100} name="jobTitle" /></div>
      <div className="grid gap-2"><Label htmlFor="profile-email">Email</Label><Input disabled id="profile-email" value={email} /><p className="text-xs text-muted-foreground">Managed by your authentication provider.</p></div>
      <FormMessage state={state} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
