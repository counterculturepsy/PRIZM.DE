// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { tenantWhere } from "./tenant";
import { services, users, workspaceMembers, workspaces } from "./schema";

describe("PostgreSQL tenancy schema", () => {
  it("applies migrations and keeps workspace-owned service queries isolated", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });

    const [user] = await db.insert(users).values({ email: "owner@example.com" }).returning({ id: users.id });
    const [workspaceA, workspaceB] = await db.insert(workspaces).values([{ name: "Studio A", slug: "studio-a" }, { name: "Studio B", slug: "studio-b" }]).returning({ id: workspaces.id });
    if (!user || !workspaceA || !workspaceB) throw new Error("Test fixtures were not created");

    await db.insert(workspaceMembers).values({ workspaceId: workspaceA.id, userId: user.id, role: "owner", status: "active" });
    await db.insert(services).values([
      { workspaceId: workspaceA.id, name: "Web Design A", slug: "web-design" },
      { workspaceId: workspaceB.id, name: "Web Design B", slug: "web-design" },
    ]);

    const scope = createWorkspaceScope({ workspaceId: workspaceA.id, userId: user.id, role: "owner" });
    const visible = await db.select({ name: services.name, workspaceId: services.workspaceId }).from(services).where(tenantWhere(services.workspaceId, scope));

    expect(visible).toEqual([{ name: "Web Design A", workspaceId: workspaceA.id }]);
    await expect(db.insert(services).values({ workspaceId: workspaceA.id, name: "Duplicate", slug: "web-design" })).rejects.toThrow();
    await client.close();
  });
});
