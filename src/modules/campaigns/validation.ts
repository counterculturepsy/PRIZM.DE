import { z } from "zod";

export const campaignSchema = z.object({ name: z.string().trim().min(2).max(120), dailyRecipientCap: z.coerce.number().int().min(1).max(100), requestKey: z.uuid() });
export const templateSchema = z.object({ name: z.string().trim().min(2).max(100), subject: z.string().trim().min(2).max(200).refine((v) => !/[\r\n]/.test(v), "Subject must be one line"), body: z.string().trim().min(10).max(5000) });
export const stepSchema = z.object({ campaignId: z.uuid(), templateId: z.uuid(), position: z.coerce.number().int().min(1).max(10), delayDays: z.coerce.number().int().min(0).max(90) });
export const recipientSchema = z.object({ campaignId: z.uuid(), contactId: z.uuid(), contactBasis: z.string().trim().min(10).max(500) });
export const campaignReviewSchema = z.object({ campaignId: z.uuid(), note: z.string().trim().min(10).max(1000) });
export const removeEnrollmentSchema = z.object({ campaignId: z.uuid(), recipientId: z.uuid() });
export const removeStepSchema = z.object({ campaignId: z.uuid(), stepId: z.uuid() });

export function preparationIssues(steps: readonly { position: number; delayDays: number }[], recipients: readonly { blockedReasons: readonly string[] }[], cap: number): string[] {
  const issues: string[] = [];
  if (!steps.length) issues.push("Add at least one sequence step.");
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  if (ordered.some((step, i) => step.position !== i + 1)) issues.push("Sequence positions must start at 1 and have no gaps.");
  if (ordered.some((step, i) => i > 0 && step.delayDays < ordered[i - 1]!.delayDays)) issues.push("Cumulative delays must not decrease between steps.");
  if (!recipients.length) issues.push("Enroll at least one permitted business contact.");
  if (recipients.length > cap) issues.push("Audience exceeds the configured daily recipient cap.");
  if (recipients.some((recipient) => recipient.blockedReasons.length)) issues.push("Resolve blocked recipients before review.");
  return issues;
}

export const deliveryBlockers = ["Email provider and verified sender are not configured.", "Unsubscribe and bounce processing are not operational.", "Delivery worker, reconciliation, and sending controls are not enabled."] as const;
