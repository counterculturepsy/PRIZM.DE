import type { Metadata } from "next";
import { WorkspaceForm } from "@/components/forms/workspace-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create workspace" };

export default function NewWorkspacePage() {
  return <main className="mx-auto max-w-2xl px-5 py-10 sm:px-6 lg:py-16"><Card className="p-7 sm:p-10"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Workspace 01</p><h1 className="mt-3 text-3xl font-semibold">Create your PRIZM workspace</h1><p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">All prospects, audits, contacts, AI outputs, and settings will be isolated inside this tenant boundary.</p><WorkspaceForm /></Card></main>;
}
