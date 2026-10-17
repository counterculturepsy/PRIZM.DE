// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import {
  auditLogs,
  companies,
  contacts,
  crmActivities,
  crmNotes,
  crmTasks,
  deals,
  leads,
  suppressionEntries,
  users,
  workspaceMembers,
  workspaces,
} from "@/server/db/schema";

describe("CRM service", () => {
  it("keeps lead mutations idempotent, audited, and tenant isolated", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "sales@example.com", name: "Sales User" }).returning({ id: users.id });
    const [alpha, beta] = await db.insert(workspaces).values([
      { name: "Alpha", slug: "crm-alpha", currency: "ZAR" },
      { name: "Beta", slug: "crm-beta", currency: "ZAR" },
    ]).returning({ id: workspaces.id });
    if (!user || !alpha || !beta) throw new Error("CRM fixtures were not created");
    await db.insert(workspaceMembers).values([
      { workspaceId: alpha.id, userId: user.id, role: "sales", status: "active", joinedAt: new Date() },
      { workspaceId: beta.id, userId: user.id, role: "sales", status: "active", joinedAt: new Date() },
    ]);
    const [company] = await db.insert(companies).values({
      workspaceId: alpha.id, name: "Alpha Studio", dedupeKey: "domain:alpha-studio.example", industry: "Creative",
    }).returning({ id: companies.id });
    if (!company) throw new Error("Company fixture was not created");

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const service = await import("./service");
    const queries = await import("./queries");
    const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "sales" });
    const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "sales" });

    const first = await service.createCrmLead(alphaScope, { companyId: company.id, title: "Brand platform" });
    const second = await service.createCrmLead(alphaScope, { companyId: company.id, title: "Duplicate attempt" });
    expect(first.created).toBe(true);
    expect(second).toEqual({ leadId: first.leadId, created: false });
    await expect(service.createCrmLead(betaScope, { companyId: company.id, title: "Cross tenant" })).rejects.toBeInstanceOf(service.CrmMutationError);

    await expect(service.changeDealStage(alphaScope, { leadId: first.leadId, stage: "discovery" })).resolves.toEqual({ changed: true });
    await expect(service.changeDealStage(alphaScope, { leadId: first.leadId, stage: "discovery" })).resolves.toEqual({ changed: false });
    await expect(service.changeDealStage(alphaScope, { leadId: first.leadId, stage: "lost" })).rejects.toBeInstanceOf(service.CrmMutationError);
    const contact = await service.addCrmContact(alphaScope, {
      leadId: first.leadId,
      firstName: "Ari",
      email: "Ari@Example.com",
      sourceKind: "user_supplied",
      sourceLabel: "Client referral",
      confidence: "medium",
    });
    await service.addCrmNote(alphaScope, { leadId: first.leadId, body: "Confirm scope before drafting anything." });
    const task = await service.addCrmTask(alphaScope, { leadId: first.leadId, title: "Review source evidence", assignedToUserId: user.id });
    await expect(service.completeCrmTask(alphaScope, task.id)).resolves.toEqual({ changed: true });
    await expect(service.completeCrmTask(alphaScope, task.id)).resolves.toEqual({ changed: false });
    await expect(service.suppressCrmContact(alphaScope, { leadId: first.leadId, contactId: contact.id, channel: "email", reason: "Opt-out request" })).resolves.toEqual({ created: true });
    await expect(service.suppressCrmContact(alphaScope, { leadId: first.leadId, contactId: contact.id, channel: "email", reason: "Repeated request" })).resolves.toEqual({ created: false });

    await expect(queries.getCrmLead(alphaScope, first.leadId)).resolves.toMatchObject({
      id: first.leadId,
      stage: "discovery",
      contacts: [{ id: contact.id, normalizedEmail: "ari@example.com", doNotContact: true }],
      notes: [{ body: "Confirm scope before drafting anything." }],
      tasks: [{ id: task.id, status: "completed" }],
    });
    await expect(queries.getCrmLead(betaScope, first.leadId)).resolves.toBeNull();
    await expect(queries.listCrmLeads(betaScope)).resolves.toHaveLength(0);

    expect(await db.select().from(leads)).toHaveLength(1);
    expect(await db.select().from(deals)).toHaveLength(1);
    expect(await db.select().from(contacts)).toHaveLength(1);
    expect(await db.select().from(crmNotes)).toHaveLength(1);
    expect(await db.select().from(crmTasks)).toHaveLength(1);
    expect(await db.select().from(suppressionEntries)).toHaveLength(1);
    expect(await db.select().from(crmActivities)).toHaveLength(7);
    expect(await db.select().from(auditLogs).where(and(eq(auditLogs.workspaceId, alpha.id), eq(auditLogs.targetType, "lead")))).toHaveLength(3);

    await expect(db.insert(leads).values({
      workspaceId: beta.id,
      companyId: company.id,
      ownerUserId: user.id,
      title: "Invalid cross-tenant lead",
    })).rejects.toThrow();
    await client.close();
  });
});
