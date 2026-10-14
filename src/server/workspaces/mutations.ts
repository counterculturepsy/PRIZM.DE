import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import {
  auditLogs,
  idealCustomerProfiles,
  onboardingProgress,
  services,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
  users,
} from "@/server/db/schema";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { toSlug } from "@/modules/workspaces/validation";

export async function createWorkspace(input: { name: string; userId: string }) {
  const db = getDatabase();
  const slug = `${toSlug(input.name)}-${randomBytes(3).toString("hex")}`;

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: input.name, slug })
      .returning({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug });
    if (!workspace) throw new Error("Workspace could not be created");

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: input.userId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    });
    await tx.insert(onboardingProgress).values({ workspaceId: workspace.id });
    await tx.insert(idealCustomerProfiles).values({ workspaceId: workspace.id });
    await tx.insert(auditLogs).values({
      workspaceId: workspace.id,
      actorUserId: input.userId,
      action: "workspace.created",
      targetType: "workspace",
      targetId: workspace.id,
    });
    return workspace;
  });
}

export async function completeOnboarding(
  scope: WorkspaceScope,
  input: {
    services: string[];
    cities: string[];
    industries: string[];
    minimumBudget: number;
    maximumBudget: number;
  },
) {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    for (const serviceName of input.services) {
      await tx
        .insert(services)
        .values({ workspaceId: scope.workspaceId, name: serviceName, slug: toSlug(serviceName) })
        .onConflictDoNothing({ target: [services.workspaceId, services.slug] });
    }
    await tx
      .update(idealCustomerProfiles)
      .set({
        cities: input.cities,
        industries: input.industries,
        minimumBudgetMinor: input.minimumBudget * 100,
        maximumBudgetMinor: input.maximumBudget * 100,
        updatedAt: new Date(),
      })
      .where(eq(idealCustomerProfiles.workspaceId, scope.workspaceId));
    await tx
      .update(onboardingProgress)
      .set({ currentStep: 5, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(onboardingProgress.workspaceId, scope.workspaceId));
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      action: "workspace.onboarding_completed",
      targetType: "workspace",
      targetId: scope.workspaceId,
    });
  });
}

export async function createWorkspaceInvitation(
  scope: WorkspaceScope,
  input: { email: string; role: "admin" | "sales" | "developer" | "viewer" },
) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [existingMember] = await tx
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, scope.workspaceId),
          sql`lower(${users.email}) = ${input.email}`,
        ),
      )
      .limit(1);
    if (existingMember) throw new WorkspaceInvitationError("That person is already a workspace member.");

    await tx
      .update(workspaceInvitations)
      .set({ status: "revoked" })
      .where(
        and(
          eq(workspaceInvitations.workspaceId, scope.workspaceId),
          eq(workspaceInvitations.email, input.email),
          eq(workspaceInvitations.status, "pending"),
        ),
      );
    const [invitation] = await tx
      .insert(workspaceInvitations)
      .values({
        workspaceId: scope.workspaceId,
        email: input.email,
        role: input.role,
        tokenHash,
        invitedByUserId: scope.userId,
        expiresAt,
      })
      .returning({ id: workspaceInvitations.id });
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      action: "workspace.invitation_created",
      targetType: "workspace_invitation",
      targetId: invitation?.id,
      metadata: { role: input.role },
    });
  });
  return { token, expiresAt };
}

export async function acceptWorkspaceInvitation(input: { token: string; userId: string; email: string }) {
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.tokenHash, tokenHash),
          eq(workspaceInvitations.status, "pending"),
        ),
      )
      .limit(1);

    if (!invitation || invitation.expiresAt <= new Date()) return null;
    if (invitation.email !== input.email.trim().toLowerCase()) return null;

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invitation.workspaceId,
        userId: input.userId,
        role: invitation.role,
        status: "active",
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: invitation.role, status: "active", joinedAt: new Date(), updatedAt: new Date() },
        setWhere: sql`${workspaceMembers.status} = 'invited'`,
      });
    await tx
      .update(workspaceInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id));
    await tx.insert(auditLogs).values({
      workspaceId: invitation.workspaceId,
      actorUserId: input.userId,
      action: "workspace.invitation_accepted",
      targetType: "workspace_invitation",
      targetId: invitation.id,
    });
    return invitation.workspaceId;
  });
}

export class WorkspaceInvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceInvitationError";
  }
}
