import { z } from "zod";

export const workspaceRoles = ["owner", "admin", "sales", "developer", "viewer"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];
export type WorkspaceId = string & { readonly __brand: "WorkspaceId" };

export type WorkspaceScope = Readonly<{
  workspaceId: WorkspaceId;
  userId: string;
  role: WorkspaceRole;
}>;

const scopeSchema = z.object({
  workspaceId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(workspaceRoles),
});

export function createWorkspaceScope(input: z.input<typeof scopeSchema>): WorkspaceScope {
  const parsed = scopeSchema.parse(input);
  return { ...parsed, workspaceId: parsed.workspaceId as WorkspaceId };
}

const roleCapabilities = {
  owner: ["read", "write", "manage_workspace", "manage_members", "manage_billing"],
  admin: ["read", "write", "manage_workspace", "manage_members"],
  sales: ["read", "write"],
  developer: ["read", "write"],
  viewer: ["read"],
} as const satisfies Record<WorkspaceRole, readonly string[]>;

export type WorkspaceCapability = (typeof roleCapabilities)[WorkspaceRole][number];

export function hasCapability(scope: WorkspaceScope, capability: WorkspaceCapability): boolean {
  return (roleCapabilities[scope.role] as readonly string[]).includes(capability);
}

export function assertWorkspaceMatch(scope: WorkspaceScope, recordWorkspaceId: string): void {
  if (scope.workspaceId !== recordWorkspaceId) throw new WorkspaceAccessError();
}

export class WorkspaceAccessError extends Error {
  constructor() {
    super("Workspace access denied");
    this.name = "WorkspaceAccessError";
  }
}
