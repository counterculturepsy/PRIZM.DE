import { and, asc, desc, eq } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import { tenantWhere } from "@/server/db/tenant";
import {
  idealCustomerProfiles,
  services,
  users,
  workspaceInvitations,
  workspaceMembers,
} from "@/server/db/schema";

export function listServices(scope: WorkspaceScope) {
  return getDatabase()
    .select()
    .from(services)
    .where(tenantWhere(services.workspaceId, scope))
    .orderBy(asc(services.name));
}

export async function getIdealCustomerProfile(scope: WorkspaceScope) {
  const [profile] = await getDatabase()
    .select()
    .from(idealCustomerProfiles)
    .where(tenantWhere(idealCustomerProfiles.workspaceId, scope))
    .limit(1);
  return profile ?? null;
}

export function listWorkspaceMembers(scope: WorkspaceScope) {
  return getDatabase()
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(tenantWhere(workspaceMembers.workspaceId, scope))
    .orderBy(asc(users.email));
}

export function listPendingInvitations(scope: WorkspaceScope) {
  return getDatabase()
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        tenantWhere(workspaceInvitations.workspaceId, scope),
        eq(workspaceInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(workspaceInvitations.createdAt));
}
