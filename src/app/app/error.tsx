"use client";

import { Button } from "@/components/ui/button";

export default function ApplicationError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6"><div className="rounded-2xl border border-error/30 bg-error/5 p-7"><p className="font-mono text-xs uppercase tracking-[0.18em] text-error">Workspace unavailable</p><h1 className="mt-3 text-2xl font-semibold">We could not load this view.</h1><p className="mt-3 text-sm text-muted-foreground">No sensitive diagnostic details were exposed. Try again; if the problem continues, contact your workspace administrator.</p><Button className="mt-6" onClick={reset}>Try again</Button></div></main>;
}
