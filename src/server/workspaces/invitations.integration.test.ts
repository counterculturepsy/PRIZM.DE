// @vitest-environment node

import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { users, workspaceInvitations, workspaceMembers, workspaces } from "@/server/db/schema";

describe("workspace invitations", () => {
  it("cannot invite or downgrade an existing owner", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });

    const [owner, admin, attacker] = await db.insert(users).values([{ email: "owner@example.com" }, { email: "admin@example.com" }, { email: "attacker@example.com" }]).returning({ id: users.id });
    const [workspace] = await db.insert(workspaces).values({ name: "Secure Studio", slug: "secure-studio" }).returning({ id: workspaces.id });
    if (!owner || !admin || !attacker || !workspace) throw new Error("Test fixtures were not created");
    await db.insert(workspaceMembers).values([
      { workspaceId: workspace.id, userId: owner.id, role: "owner", status: "active" },
      { workspaceId: workspace.id, userId: admin.id, role: "admin", status: "active" },
    ]);

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const { acceptWorkspaceInvitation, createWorkspaceInvitation, WorkspaceInvitationError } = await import("./mutations");
    const adminScope = createWorkspaceScope({ workspaceId: workspace.id, userId: admin.id, role: "admin" });

    await expect(createWorkspaceInvitation(adminScope, { email: "owner@example.com", role: "viewer" })).rejects.toBeInstanceOf(WorkspaceInvitationError);

    const token = "malicious-existing-member-invite";
    await db.insert(workspaceInvitations).values({
      workspaceId: workspace.id,
      email: "owner@example.com",
      role: "viewer",
      tokenHash: createHash("sha256").update(token).digest("hex"),
      invitedByUserId: admin.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await acceptWorkspaceInvitation({ token, userId: owner.id, email: "owner@example.com" });

    const [ownerMembership] = await db.select({ role: workspaceMembers.role, status: workspaceMembers.status }).from(workspaceMembers).where(eq(workspaceMembers.userId, owner.id));
    expect(ownerMembership).toEqual({ role: "owner", status: "active" });

    const intendedToken = "intended-recipient-only";
    await db.insert(workspaceInvitations).values({
      workspaceId: workspace.id,
      email: "target@example.com",
      role: "sales",
      tokenHash: createHash("sha256").update(intendedToken).digest("hex"),
      invitedByUserId: admin.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(acceptWorkspaceInvitation({ token: intendedToken, userId: attacker.id, email: "attacker@example.com" })).resolves.toBeNull();
    const attackerMembership = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, attacker.id));
    expect(attackerMembership).toHaveLength(0);
    await client.close();
  });
});
