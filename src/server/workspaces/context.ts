import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { WorkspaceCapability, WorkspaceRole } from "@/modules/workspaces/scope";
import { createWorkspaceScope, hasCapability } from "@/modules/workspaces/scope";
import { requireSession } from "@/server/auth/session";
import { getDatabase } from "@/server/db";
import { onboardingProgress, workspaceMembers, workspaces } from "@/server/db/schema";

export const ACTIVE_WORKSPACE_COOKIE = "prizm_active_workspace";

export type WorkspaceSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  onboardingCompleted: boolean;
}>;

export async function listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      completedAt: onboardingProgress.completedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .leftJoin(onboardingProgress, eq(onboardingProgress.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, "active"),
        eq(workspaces.status, "active"),
      ),
    )
    .orderBy(asc(workspaces.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    onboardingCompleted: Boolean(row.completedAt),
  }));
}

export async function getWorkspaceContext(capability: WorkspaceCapability = "read") {
  const session = await requireSession();
  const memberships = await listUserWorkspaces(session.user.id);
  if (memberships.length === 0) redirect("/app/workspaces/new");

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const workspace = memberships.find((item) => item.id === selectedId) ?? memberships[0];
  if (!workspace) redirect("/app/workspaces/new");

  const scope = createWorkspaceScope({
    workspaceId: workspace.id,
    userId: session.user.id,
    role: workspace.role,
  });
  if (!hasCapability(scope, capability)) notFound();

  return { session, workspace, memberships, scope } as const;
}

export async function verifyWorkspaceMembership(userId: string, workspaceId: string) {
  const memberships = await listUserWorkspaces(userId);
  return memberships.find((workspace) => workspace.id === workspaceId) ?? null;
}
