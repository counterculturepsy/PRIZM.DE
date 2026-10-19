"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { getWorkspaceContext } from "@/server/workspaces/context";
import { CampaignError, createCampaign, createCampaignTemplate, enrollCampaignRecipient, removeCampaignEnrollment, removeCampaignStep, reviewCampaign, saveCampaignStep } from "@/server/campaigns/service";

function values(form: FormData) { return Object.fromEntries(form.entries()); }
function errorState(error: unknown): FormState {
  if (error instanceof CampaignError) return { status: "error", message: error.message };
  if (error instanceof z.ZodError) return { status: "error", message: error.issues[0]?.message ?? "Check your campaign details." };
  throw error;
}
export async function createCampaignAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  let id: string;
  try { id = await createCampaign(scope, values(form)); } catch (error) { return errorState(error); }
  redirect(`/app/campaigns/${id}`);
}
export async function createTemplateAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  try { await createCampaignTemplate(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns/templates");
  return { status: "success", message: "Immutable template saved." };
}
export async function saveStepAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  try { await saveCampaignStep(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns", "layout");
  return { status: "success", message: "Step saved. Campaign review reset." };
}
export async function enrollRecipientAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  let added: boolean;
  try { added = await enrollCampaignRecipient(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns", "layout");
  return { status: "success", message: added ? "Contact enrolled for preparation. No email sent." : "This email is already enrolled." };
}
export async function reviewCampaignAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("manage_workspace");
  try { await reviewCampaign(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns", "layout");
  return { status: "success", message: "Preparation review recorded. Delivery remains disabled." };
}
export async function removeEnrollmentAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  try { await removeCampaignEnrollment(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns", "layout");
  return { status: "success", message: "Enrollment removed. Contact and suppression records preserved." };
}
export async function removeStepAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write");
  try { await removeCampaignStep(scope, values(form)); } catch (error) { return errorState(error); }
  revalidatePath("/app/campaigns", "layout");
  return { status: "success", message: "Step removed. Check sequence positions before the next review." };
}
