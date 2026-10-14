"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/app/app/actions";

export function SubmitButton({ children, pendingLabel = "Saving…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? pendingLabel : children}</Button>;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p aria-live="polite" className={state.status === "error" ? "text-sm text-error" : "text-sm text-success"} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}
