import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { Card } from "@/components/ui/card";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { workspace } = await getWorkspaceContext("write");
  if (workspace.onboardingCompleted) redirect("/app");
  return <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:py-16"><div className="mb-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">{workspace.name} · onboarding</p><h1 className="mt-3 text-3xl font-semibold">Build your ideal-customer lens.</h1><p className="mt-3 text-muted-foreground">These settings will rank opportunities later; they do not trigger searches or external communication.</p></div><Card className="p-6 sm:p-9"><OnboardingForm /></Card></main>;
}
