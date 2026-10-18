"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/app/actions";
import { generateDraftSchema, policySchema, reviewSchema } from "@/modules/ai/sales";
import { generateSalesDraft, reviewSalesDraft, SalesAssistantError, saveAiPolicy } from "@/server/ai/service";
import { getWorkspaceContext } from "@/server/workspaces/context";

function values(form: FormData) { return Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string")); }

export async function generateDraftAction(_state: FormState, form: FormData): Promise<FormState> {
  const parsed = generateDraftSchema.safeParse(values(form));
  if (!parsed.success) return { status: "error", message: "Choose a lead and acknowledge the evidence transfer and human review requirement." };
  const { scope } = await getWorkspaceContext("write");
  let id: string;
  try { id = await generateSalesDraft(scope, parsed.data); }
  catch (error) { if (error instanceof SalesAssistantError) return { status: "error", message: error.message }; throw error; }
  redirect(`/app/ai/drafts/${id}`);
}

export async function reviewDraftAction(_state: FormState, form: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse(values(form));
  if (!parsed.success) return { status: "error", message: "Choose a decision and add a review note (2–1000 characters)." };
  const { scope } = await getWorkspaceContext("write");
  try { await reviewSalesDraft(scope, parsed.data); }
  catch (error) { if (error instanceof SalesAssistantError) return { status: "error", message: error.message }; throw error; }
  revalidatePath(`/app/ai/drafts/${parsed.data.draftId}`);
  return { status: "success", message: "Review recorded. No message has been sent." };
}

export async function saveAiPolicyAction(_state: FormState, form: FormData): Promise<FormState> {
  const parsed = policySchema.safeParse({ enabled: form.get("enabled") === "on", dailyRequestLimit: form.get("dailyRequestLimit") });
  if (!parsed.success) return { status: "error", message: "Enter a daily limit between 1 and 100 requests." };
  const { scope } = await getWorkspaceContext("manage_workspace");
  try { await saveAiPolicy(scope, parsed.data); }
  catch (error) { if (error instanceof SalesAssistantError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/app/settings/ai");
  return { status: "success", message: "AI workspace policy saved." };
}
