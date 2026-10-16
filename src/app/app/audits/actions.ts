"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { AuditPolicyError } from "@/modules/audits/types";
import { AuditRequestError, queueWebsiteAudit } from "@/server/audits/service";
import { getWorkspaceContext } from "@/server/workspaces/context";

export async function queueWebsiteAuditAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ companyId: z.uuid(), authorization: z.literal("on") }).safeParse({
    companyId: formData.get("companyId"), authorization: formData.get("authorization"),
  });
  if (!parsed.success) return { status: "error", message: "Choose a company and confirm authorization before continuing." };
  const { scope } = await getWorkspaceContext("write");
  let audit;
  try {
    audit = await queueWebsiteAudit(scope, { companyId: parsed.data.companyId, authorizationConfirmed: true });
  } catch (error) {
    if (error instanceof AuditRequestError || error instanceof AuditPolicyError) return { status: "error", message: error.message };
    throw error;
  }
  redirect(`/app/audits/${audit.id}`);
}
