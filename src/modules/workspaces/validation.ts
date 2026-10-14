import { z } from "zod";
import { workspaceRoles } from "./scope";

export const workspaceNameSchema = z.string().trim().min(2).max(80);

export const createWorkspaceSchema = z.object({ name: workspaceNameSchema });

export const selectWorkspaceSchema = z.object({ workspaceId: z.uuid() });

export const inviteMemberSchema = z.object({
  email: z.email().trim().toLowerCase(),
  role: z.enum(workspaceRoles).exclude(["owner"]),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  startingPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  averagePrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  deliveryTimeDays: z.coerce.number().int().min(1).max(730).optional(),
});

const listFromText = z.string().transform((value) =>
  [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))].slice(0, 50),
);

export const idealCustomerProfileInputSchema = z
  .object({
    cities: listFromText.pipe(z.array(z.string().min(2).max(80)).min(1).max(30)),
    industries: listFromText.pipe(z.array(z.string().min(2).max(80)).min(1).max(30)),
    minimumBudget: z.coerce.number().int().min(0).max(10_000_000),
    maximumBudget: z.coerce.number().int().min(0).max(10_000_000),
  })
  .refine((value) => value.maximumBudget >= value.minimumBudget, {
    path: ["maximumBudget"],
    message: "Maximum budget must be greater than or equal to minimum budget",
  });

export const onboardingSchema = idealCustomerProfileInputSchema.and(
  z.object({ services: listFromText.pipe(z.array(z.string().min(2).max(80)).min(1).max(20)) }),
);

export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "workspace";
}
