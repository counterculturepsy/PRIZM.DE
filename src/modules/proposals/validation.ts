import { z } from "zod";

const boundedText = (min: number, max: number) => z.string().trim().min(min).max(max);
export const proposalLineItemSchema = z.object({
  description: boundedText(2, 240),
  quantity: z.coerce.number().int().min(1).max(10_000),
  unitAmountMinor: z.coerce.number().int().min(0).max(100_000_000),
}).strict();
export const proposalDraftSchema = z.object({
  leadId: z.uuid(), requestKey: z.uuid(), title: boundedText(2, 160), summary: boundedText(2, 2000),
  scope: boundedText(2, 5000), deliverables: boundedText(2, 5000), assumptions: z.string().trim().max(3000),
  exclusions: z.string().trim().max(3000), timeline: boundedText(2, 1000), discountMinor: z.coerce.number().int().min(0).max(100_000_000).default(0),
  items: z.array(proposalLineItemSchema).min(1).max(50),
});
export const proposalRevisionSchema = proposalDraftSchema.omit({ leadId: true, requestKey: true });
export const proposalApprovalSchema = z.object({ proposalId: z.uuid(), note: boundedText(2, 1000) });

export type ProposalLineItem = z.infer<typeof proposalLineItemSchema> & { lineTotalMinor: number };
export type ProposalSnapshot = Readonly<{
  title: string; summary: string; scope: string; deliverables: string; assumptions: string; exclusions: string; timeline: string;
  currency: string; items: ProposalLineItem[]; subtotalMinor: number; discountMinor: number; totalMinor: number;
}>;

export function parseMajorToMinor(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) throw new Error("Enter a valid amount with no more than two decimal places");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Amount is too large");
  return result;
}

export function calculateProposal(input: z.input<typeof proposalRevisionSchema>, currency: string): ProposalSnapshot {
  const parsed = proposalRevisionSchema.parse(input);
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Unsupported workspace currency");
  const items = parsed.items.map((item) => {
    const lineTotalMinor = item.quantity * item.unitAmountMinor;
    if (!Number.isSafeInteger(lineTotalMinor)) throw new Error("Proposal amount is too large");
    return { ...item, lineTotalMinor };
  });
  const subtotalMinor = items.reduce((total, item) => total + item.lineTotalMinor, 0);
  if (!Number.isSafeInteger(subtotalMinor) || parsed.discountMinor > subtotalMinor) throw new Error("Discount cannot exceed the subtotal");
  return { ...parsed, currency, items, subtotalMinor, totalMinor: subtotalMinor - parsed.discountMinor };
}
