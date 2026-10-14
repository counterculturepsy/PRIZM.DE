"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerEnv } from "@/config/env";
import {
  createWorkspaceSchema,
  idealCustomerProfileInputSchema,
  inviteMemberSchema,
  onboardingSchema,
  selectWorkspaceSchema,
  serviceInputSchema,
  toSlug,
} from "@/modules/workspaces/validation";
import { requireSession } from "@/server/auth/session";
import { getDatabase } from "@/server/db";
import { auditLogs, services, users } from "@/server/db/schema";
import { idealCustomerProfiles } from "@/server/db/schema";
import { ACTIVE_WORKSPACE_COOKIE, getWorkspaceContext, verifyWorkspaceMembership } from "@/server/workspaces/context";
import { completeOnboarding, createWorkspace, createWorkspaceInvitation, WorkspaceInvitationError } from "@/server/workspaces/mutations";

export type FormState = Readonly<{ status: "idle" | "error" | "success"; message?: string; inviteUrl?: string }>;

function firstString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createWorkspaceAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = createWorkspaceSchema.safeParse({ name: firstString(formData, "name") });
  if (!parsed.success) return { status: "error", message: "Enter a workspace name between 2 and 80 characters." };
  const session = await requireSession();
  const workspace = await createWorkspace({ name: parsed.data.name, userId: session.user.id });
  await setActiveWorkspaceCookie(workspace.id);
  redirect("/app/onboarding");
}

export async function selectWorkspaceAction(formData: FormData) {
  const parsed = selectWorkspaceSchema.safeParse({ workspaceId: firstString(formData, "workspaceId") });
  if (!parsed.success) return;
  const session = await requireSession();
  const membership = await verifyWorkspaceMembership(session.user.id, parsed.data.workspaceId);
  if (!membership) return;
  await setActiveWorkspaceCookie(membership.id);
  redirect(membership.onboardingCompleted ? "/app" : "/app/onboarding");
}

export async function completeOnboardingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = onboardingSchema.safeParse({
    services: firstString(formData, "services"),
    cities: firstString(formData, "cities"),
    industries: firstString(formData, "industries"),
    minimumBudget: firstString(formData, "minimumBudget"),
    maximumBudget: firstString(formData, "maximumBudget"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the onboarding details." };
  const { scope } = await getWorkspaceContext("manage_workspace");
  await completeOnboarding(scope, parsed.data);
  redirect("/app");
}

export async function addServiceAction(_state: FormState, formData: FormData): Promise<FormState> {
  const optionalNumber = (key: string) => firstString(formData, key) || undefined;
  const parsed = serviceInputSchema.safeParse({
    name: firstString(formData, "name"),
    description: firstString(formData, "description"),
    startingPrice: optionalNumber("startingPrice"),
    averagePrice: optionalNumber("averagePrice"),
    deliveryTimeDays: optionalNumber("deliveryTimeDays"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the service details." };
  const { scope } = await getWorkspaceContext("manage_workspace");
  await getDatabase()
    .insert(services)
    .values({
      workspaceId: scope.workspaceId,
      name: parsed.data.name,
      slug: `${toSlug(parsed.data.name)}-${randomUUID().slice(0, 6)}`,
      description: parsed.data.description,
      startingPriceMinor: parsed.data.startingPrice === undefined ? null : parsed.data.startingPrice * 100,
      averagePriceMinor: parsed.data.averagePrice === undefined ? null : parsed.data.averagePrice * 100,
      deliveryTimeDays: parsed.data.deliveryTimeDays ?? null,
    });
  revalidatePath("/app/settings/services");
  return { status: "success", message: "Service added." };
}

export async function inviteMemberAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = inviteMemberSchema.safeParse({
    email: firstString(formData, "email"),
    role: firstString(formData, "role"),
  });
  if (!parsed.success) return { status: "error", message: "Enter a valid email and assignable role." };
  const { scope } = await getWorkspaceContext("manage_members");
  let invitation;
  try {
    invitation = await createWorkspaceInvitation(scope, parsed.data);
  } catch (error) {
    if (error instanceof WorkspaceInvitationError) return { status: "error", message: error.message };
    throw error;
  }
  const origin = getServerEnv().NEXTAUTH_URL;
  revalidatePath("/app/settings/team");
  return {
    status: "success",
    message: "Invitation created. Share this private link with the intended recipient.",
    inviteUrl: `${origin}/invite/${invitation.token}`,
  };
}

export async function updateProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const context = await getWorkspaceContext("read");
  const name = firstString(formData, "name").trim();
  const jobTitle = firstString(formData, "jobTitle").trim();
  if (name.length < 2 || name.length > 80 || jobTitle.length > 100) {
    return { status: "error", message: "Check the name and job title lengths." };
  }
  await getDatabase().transaction(async (tx) => {
    await tx.update(users).set({ name, jobTitle: jobTitle || null, updatedAt: new Date() }).where(eq(users.id, session.user.id));
    await tx.insert(auditLogs).values({
      workspaceId: context.scope.workspaceId,
      actorUserId: session.user.id,
      action: "user.profile_updated",
      targetType: "user",
      targetId: session.user.id,
    });
  });
  revalidatePath("/app/settings/profile");
  return { status: "success", message: "Profile updated." };
}

export async function updateIcpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = idealCustomerProfileInputSchema.safeParse({
    cities: firstString(formData, "cities"),
    industries: firstString(formData, "industries"),
    minimumBudget: firstString(formData, "minimumBudget"),
    maximumBudget: firstString(formData, "maximumBudget"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the ICP details." };
  const { scope } = await getWorkspaceContext("manage_workspace");
  await getDatabase().transaction(async (tx) => {
    await tx.update(idealCustomerProfiles).set({
      cities: parsed.data.cities,
      industries: parsed.data.industries,
      minimumBudgetMinor: parsed.data.minimumBudget * 100,
      maximumBudgetMinor: parsed.data.maximumBudget * 100,
      updatedAt: new Date(),
    }).where(eq(idealCustomerProfiles.workspaceId, scope.workspaceId));
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      action: "workspace.icp_updated",
      targetType: "ideal_customer_profile",
      targetId: scope.workspaceId,
    });
  });
  revalidatePath("/app/settings/icp");
  return { status: "success", message: "Ideal customer profile updated." };
}
