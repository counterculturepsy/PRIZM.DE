// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import type { WebsiteAuditProvider } from "@/modules/audits/types";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { auditFindings, auditJobs, auditPages, companies, users, websiteAudits, websites, workspaceMembers, workspaces } from "@/server/db/schema";

describe("website audit queue", () => {
  it("queues and processes one tenant-scoped, durable audit", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "auditor@example.com" }).returning({ id: users.id });
    const [alpha, beta] = await db.insert(workspaces).values([{ name: "Alpha", slug: "audit-alpha" }, { name: "Beta", slug: "audit-beta" }]).returning({ id: workspaces.id });
    if (!user || !alpha || !beta) throw new Error("Test fixtures were not created");
    await db.insert(workspaceMembers).values([
      { workspaceId: alpha.id, userId: user.id, role: "developer", status: "active" },
      { workspaceId: beta.id, userId: user.id, role: "developer", status: "active" },
    ]);
    const [company] = await db.insert(companies).values({ workspaceId: alpha.id, name: "Example", dedupeKey: "domain:example.com", website: "https://example.com", domain: "example.com" }).returning({ id: companies.id });
    if (!company) throw new Error("Company fixture was not created");
    await expect(db.insert(websites).values({
      workspaceId: beta.id,
      companyId: company.id,
      url: "https://example.com/",
      normalizedOrigin: "https://example.com",
    })).rejects.toThrow();

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const { AuditRequestError, processNextAuditJob, queueWebsiteAudit } = await import("./service");
    const { AuditPolicyError } = await import("@/modules/audits/types");
    const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "developer" });
    const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "developer" });
    await expect(queueWebsiteAudit(betaScope, { companyId: company.id, authorizationConfirmed: true })).rejects.toBeInstanceOf(AuditRequestError);
    const audit = await queueWebsiteAudit(alphaScope, { companyId: company.id, authorizationConfirmed: true });
    await expect(queueWebsiteAudit(alphaScope, { companyId: company.id, authorizationConfirmed: true })).rejects.toThrow("already queued or running");

    const provider: WebsiteAuditProvider = {
      id: "test-provider",
      inspect: async (url) => ({
        requestedUrl: url.toString(), finalUrl: url.toString(), status: 200, contentType: "text/html",
        headers: {}, body: Buffer.from("<html><body><h1>Example</h1></body></html>"), responseBytes: 49,
        durationMs: 50, observedAt: new Date("2026-10-15T00:00:00Z"), robotsAllowed: true,
      }),
    };
    await expect(processNextAuditJob(provider, "test-worker")).resolves.toEqual({ auditId: audit.id, status: "completed" });
    const [stored] = await db.select().from(websiteAudits).where(and(eq(websiteAudits.workspaceId, alpha.id), eq(websiteAudits.id, audit.id)));
    const jobs = await db.select().from(auditJobs).where(eq(auditJobs.auditId, audit.id));
    const findings = await db.select().from(auditFindings).where(eq(auditFindings.auditId, audit.id));
    expect(stored?.status).toBe("completed");
    expect(stored?.score).toBeTypeOf("number");
    expect(jobs[0]?.status).toBe("completed");
    expect(findings.length).toBeGreaterThan(0);

    const [blockedCompany] = await db.insert(companies).values({ workspaceId: alpha.id, name: "Blocked", dedupeKey: "domain:blocked.example", website: "https://blocked.example", domain: "blocked.example" }).returning({ id: companies.id });
    if (!blockedCompany) throw new Error("Blocked fixture was not created");
    const blockedAudit = await queueWebsiteAudit(alphaScope, { companyId: blockedCompany.id, authorizationConfirmed: true });
    const blockedProvider: WebsiteAuditProvider = { id: "blocked-provider", inspect: async () => { throw new AuditPolicyError("robots_disallowed", "The website robots policy does not allow this audit."); } };
    await expect(processNextAuditJob(blockedProvider, "test-worker")).resolves.toEqual({ auditId: blockedAudit.id, status: "blocked" });
    const [blocked] = await db.select().from(websiteAudits).where(eq(websiteAudits.id, blockedAudit.id));
    const blockedPages = await db.select().from(auditPages).where(eq(auditPages.auditId, blockedAudit.id));
    expect(blocked).toMatchObject({ status: "blocked", robotsAllowed: false, errorCode: "robots_disallowed" });
    expect(blockedPages[0]?.status).toBe("blocked");

    const { getWebsiteAudit } = await import("./queries");
    await expect(getWebsiteAudit(betaScope, audit.id)).resolves.toBeNull();
    await expect(getWebsiteAudit(alphaScope, audit.id)).resolves.toMatchObject({ audit: { id: audit.id } });
    await client.close();
  });
});
