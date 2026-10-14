// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { companies, companySources, discoveryRuns, users, workspaceMembers, workspaces } from "@/server/db/schema";

describe("company CSV imports", () => {
  it("is idempotent within a workspace and isolated between workspaces", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "owner@example.com" }).returning({ id: users.id });
    const workspaceRows = await db.insert(workspaces).values([
      { name: "Alpha", slug: "alpha" }, { name: "Beta", slug: "beta" },
    ]).returning({ id: workspaces.id });
    const [alpha, beta] = workspaceRows;
    if (!user || !alpha || !beta) throw new Error("Test fixtures were not created");
    await db.insert(workspaceMembers).values([
      { workspaceId: alpha.id, userId: user.id, role: "owner", status: "active" },
      { workspaceId: beta.id, userId: user.id, role: "owner", status: "active" },
    ]);

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const { importCompanyCsv } = await import("./imports");
    const csv = "name,website,industry,city,province,external_id\nAcme Studio,acme.example,Creative,Johannesburg,Gauteng,acme-1";
    const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "owner" });
    const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "owner" });

    await expect(importCompanyCsv(alphaScope, csv)).resolves.toEqual({ rows: 1, created: 1, updated: 0 });
    const partialCsv = "name,website,external_id\nAcme Studio,acme.example,acme-1";
    await expect(importCompanyCsv(alphaScope, partialCsv)).resolves.toEqual({ rows: 1, created: 0, updated: 1 });
    await expect(importCompanyCsv(betaScope, csv)).resolves.toEqual({ rows: 1, created: 1, updated: 0 });

    const alphaCompanies = await db.select().from(companies).where(eq(companies.workspaceId, alpha.id));
    const betaCompanies = await db.select().from(companies).where(eq(companies.workspaceId, beta.id));
    const sources = await db.select().from(companySources).where(eq(companySources.workspaceId, alpha.id));
    const runs = await db.select().from(discoveryRuns).where(eq(discoveryRuns.workspaceId, alpha.id));
    expect(alphaCompanies).toHaveLength(1);
    expect(alphaCompanies[0]?.industry).toBe("Creative");
    expect(betaCompanies).toHaveLength(1);
    expect(sources).toHaveLength(1);
    expect(runs).toHaveLength(2);
    expect(runs.every((run) => run.status === "completed")).toBe(true);
    await client.close();
  });
});
