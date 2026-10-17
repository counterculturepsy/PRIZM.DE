"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/app/actions";
import {
  completeTaskSchema,
  createContactSchema,
  createLeadSchema,
  createNoteSchema,
  createTaskSchema,
  suppressContactSchema,
  updateDealStageSchema,
} from "@/modules/crm/validation";
import {
  addCrmContact,
  addCrmNote,
  addCrmTask,
  changeDealStage,
  completeCrmTask,
  createCrmLead,
  CrmMutationError,
  suppressCrmContact,
} from "@/server/crm/service";
import { getWorkspaceContext } from "@/server/workspaces/context";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalid(message: string): FormState {
  return { status: "error", message };
}

function revalidateCrm(leadId?: string) {
  revalidatePath("/app/leads");
  revalidatePath("/app/crm/pipeline");
  revalidatePath("/app/crm/contacts");
  revalidatePath("/app/crm/tasks");
  revalidatePath("/app/crm/activity");
  if (leadId) revalidatePath(`/app/leads/${leadId}`);
}

export async function createCrmLeadAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = createLeadSchema.safeParse({
    companyId: text(formData, "companyId"), sourceOpportunityId: text(formData, "sourceOpportunityId"), title: text(formData, "title"),
  });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the lead details.");
  const { scope } = await getWorkspaceContext("write");
  try {
    const result = await createCrmLead(scope, parsed.data);
    redirect(`/app/leads/${result.leadId}`);
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}

export async function changeDealStageAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateDealStageSchema.safeParse({ leadId: text(formData, "leadId"), stage: text(formData, "stage"), lostReason: text(formData, "lostReason") });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the pipeline stage.");
  const { scope } = await getWorkspaceContext("write");
  try {
    const result = await changeDealStage(scope, parsed.data);
    revalidateCrm(parsed.data.leadId);
    return { status: "success", message: result.changed ? "Pipeline stage updated." : "The deal is already in this stage." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}

export async function addCrmContactAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = createContactSchema.safeParse({
    leadId: text(formData, "leadId"), firstName: text(formData, "firstName"), lastName: text(formData, "lastName"),
    roleTitle: text(formData, "roleTitle"), email: text(formData, "email"), phone: text(formData, "phone"),
    sourceKind: text(formData, "sourceKind"), sourceLabel: text(formData, "sourceLabel"), sourceUrl: text(formData, "sourceUrl"), confidence: text(formData, "confidence"),
  });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the contact details.");
  const { scope } = await getWorkspaceContext("write");
  try {
    await addCrmContact(scope, parsed.data);
    revalidateCrm(parsed.data.leadId);
    return { status: "success", message: "Attributed contact added." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    if (error instanceof Error && error.message.includes("unique")) return invalid("This contact method is already stored for the company.");
    throw error;
  }
}

export async function addCrmNoteAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = createNoteSchema.safeParse({ leadId: text(formData, "leadId"), body: text(formData, "body") });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the note.");
  const { scope } = await getWorkspaceContext("write");
  try {
    await addCrmNote(scope, parsed.data);
    revalidateCrm(parsed.data.leadId);
    return { status: "success", message: "Note added." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}

export async function addCrmTaskAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = createTaskSchema.safeParse({
    leadId: text(formData, "leadId"), title: text(formData, "title"), description: text(formData, "description"),
    dueAt: text(formData, "dueAt"), assignedToUserId: text(formData, "assignedToUserId"),
  });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the task details.");
  const { scope } = await getWorkspaceContext("write");
  try {
    await addCrmTask(scope, parsed.data);
    revalidateCrm(parsed.data.leadId);
    return { status: "success", message: "Follow-up task added." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}

export async function completeCrmTaskAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = completeTaskSchema.safeParse({ taskId: text(formData, "taskId") });
  if (!parsed.success) return invalid("Choose a valid task.");
  const { scope } = await getWorkspaceContext("write");
  try {
    const result = await completeCrmTask(scope, parsed.data.taskId);
    revalidateCrm();
    return { status: "success", message: result.changed ? "Task completed." : "Task was already completed." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}

export async function suppressCrmContactAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = suppressContactSchema.safeParse({
    leadId: text(formData, "leadId"), contactId: text(formData, "contactId"), channel: text(formData, "channel"), reason: text(formData, "reason"),
  });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Check the suppression details.");
  const { scope } = await getWorkspaceContext("write");
  try {
    const result = await suppressCrmContact(scope, parsed.data);
    revalidateCrm(parsed.data.leadId);
    return { status: "success", message: result.created ? "Contact method suppressed." : "This contact method is already suppressed." };
  } catch (error) {
    if (error instanceof CrmMutationError) return invalid(error.message);
    throw error;
  }
}
