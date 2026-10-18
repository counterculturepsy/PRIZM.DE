"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/app/actions";
import { parseMajorToMinor } from "@/modules/proposals/validation";
import { approveProposal, createProposal, ProposalError, reviseProposal } from "@/server/proposals/service";
import { getWorkspaceContext } from "@/server/workspaces/context";

function payload(form: FormData) { return { title: form.get("title"), summary: form.get("summary"), scope: form.get("scope"), deliverables: form.get("deliverables"), assumptions: form.get("assumptions") ?? "", exclusions: form.get("exclusions") ?? "", timeline: form.get("timeline"), discountMinor: parseMajorToMinor(form.get("discount")), items: [{ description: form.get("itemDescription"), quantity: form.get("quantity"), unitAmountMinor: parseMajorToMinor(form.get("unitAmount")) }] }; }
function message(error: unknown) { return error instanceof ProposalError ? error.message : "Check every proposal field and amount, then try again."; }

export async function createProposalAction(_state: FormState, form: FormData): Promise<FormState> {
  const { scope } = await getWorkspaceContext("write"); let id: string;
  try { id = await createProposal(scope, { ...payload(form), leadId: form.get("leadId"), requestKey: form.get("requestKey") }); } catch (error) { return { status: "error", message: message(error) }; }
  redirect(`/app/proposals/${id}`);
}
export async function reviseProposalAction(_state: FormState, form: FormData): Promise<FormState> {
  const proposalId = String(form.get("proposalId") ?? ""); const { scope } = await getWorkspaceContext("write");
  try { await reviseProposal(scope, proposalId, payload(form)); } catch (error) { return { status: "error", message: message(error) }; }
  revalidatePath(`/app/proposals/${proposalId}`); return { status: "success", message: "A new immutable proposal version was created. Approval is required again." };
}
export async function approveProposalAction(_state: FormState, form: FormData): Promise<FormState> {
  const proposalId = String(form.get("proposalId") ?? ""); const { scope } = await getWorkspaceContext("manage_workspace");
  try { await approveProposal(scope, { proposalId, note: form.get("note") }); } catch (error) { return { status: "error", message: message(error) }; }
  revalidatePath(`/app/proposals/${proposalId}`); return { status: "success", message: "Current proposal version approved. Nothing was sent." };
}
