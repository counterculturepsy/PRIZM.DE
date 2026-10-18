// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import type { AIProvider } from "@/modules/ai/provider";
import { aiDraftRuns, auditFindings, companies, leads, leadScores, users, websiteAudits, websites, workspaceMembers, workspaces } from "@/server/db/schema";

describe("sales draft persistence and boundaries", () => {
  it("reserves budgets, deduplicates, grounds output and enforces role/tenant review", async () => {
    const client = new PGlite(); const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "ai-test@example.com" }).returning();
    const [alpha, beta] = await db.insert(workspaces).values([{ name: "Alpha", slug: "ai-alpha" }, { name: "Beta", slug: "ai-beta" }]).returning();
    if (!user || !alpha || !beta) throw new Error("fixtures");
    await db.insert(workspaceMembers).values([{ workspaceId: alpha.id, userId: user.id, role: "owner", status: "active" }, { workspaceId: beta.id, userId: user.id, role: "owner", status: "active" }]);
    const [company] = await db.insert(companies).values({ workspaceId: alpha.id, name: "Test Company", dedupeKey: "ai-test" }).returning();
    const [lead] = await db.insert(leads).values({ workspaceId: alpha.id, companyId: company!.id, title: "Evidence review" }).returning();
    const [site] = await db.insert(websites).values({ workspaceId: alpha.id, companyId: company!.id, url: "https://example.com/", normalizedOrigin: "https://example.com" }).returning();
    const [audit] = await db.insert(websiteAudits).values({ workspaceId: alpha.id, websiteId: site!.id, requestedByUserId: user.id, authorizationBasis: "test", status: "completed" }).returning();
    const [finding] = await db.insert(auditFindings).values({ workspaceId: alpha.id, auditId: audit!.id, category: "seo", code: "missing_title", severity: "medium", title: "Missing title", summary: "Title absent", evidence: "Email ari@example.com; title absent", sourceUrl: "https://example.com", observedAt: new Date(), scoreImpact: 10 }).returning();
    await db.insert(leadScores).values({ workspaceId: alpha.id, companyId: company!.id, auditId: audit!.id, totalScore: 10, priority: "low", sourceCompletedAt: new Date() });
    const alphaScope = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "owner" });
    const betaScope = createWorkspaceScope({ workspaceId: beta.id, userId: user.id, role: "owner" });
    const viewer = createWorkspaceScope({ workspaceId: alpha.id, userId: user.id, role: "viewer" });
    vi.resetModules(); vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const service = await import("./service");
    const generateStructured = vi.fn().mockResolvedValue(undefined);
    const provider: AIProvider = {
      id: "fake",
      async generateStructured(request, schema) {
        await generateStructured(request, schema);
        return {
          output: schema.parse({ title: "SEO review", sections: [{ heading: "Observation", text: "Validate the missing title.", evidenceIds: [finding!.id] }], reviewWarnings: ["Check facts and permission before use"] }),
          provider: "fake", model: "fixture", promptVersion: "sales-v1", durationMs: 10,
        };
      },
    };
    const adapter = { provider, model: "fixture" };
    const input = { leadId: lead!.id, purpose: "strategy" as const, requestKey: randomUUID() };
    await expect(service.generateSalesDraft(alphaScope, input, adapter)).rejects.toThrow("enable AI");
    await service.saveAiPolicy(alphaScope, { enabled: true, dailyRequestLimit: 1 });
    const id = await service.generateSalesDraft(alphaScope, input, adapter);
    expect(await service.generateSalesDraft(alphaScope, input, adapter)).toBe(id);
    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(generateStructured.mock.calls[0])).not.toContain("ari@example.com");
    await expect(service.generateSalesDraft(alphaScope, { ...input, requestKey: randomUUID() }, adapter)).rejects.toThrow("budget");
    await expect(service.generateSalesDraft(viewer, input, adapter)).rejects.toThrow("role");
    await expect(service.saveAiPolicy(viewer, { enabled: true, dailyRequestLimit: 100 })).rejects.toThrow("role");
    await expect(service.getSalesDraft(betaScope, id)).resolves.toBeNull();
    await expect(service.reviewSalesDraft(betaScope, { draftId: id, decision: "approved", note: "Checked" })).rejects.toThrow("unavailable");
    await service.reviewSalesDraft(alphaScope, { draftId: id, decision: "approved", note: "Evidence and proposed use reviewed" });
    await expect(service.reviewSalesDraft(alphaScope, { draftId: id, decision: "rejected", note: "Again" })).rejects.toThrow("already");
    await expect(service.getSalesDraft(alphaScope, id)).resolves.toMatchObject({ status: "completed", reviewStatus: "approved" });
    await service.saveAiPolicy(betaScope, { enabled: true, dailyRequestLimit: 10 });
    await expect(service.generateSalesDraft(betaScope, { ...input, requestKey: randomUUID() }, adapter)).rejects.toThrow("active workspace");
    await service.saveAiPolicy(alphaScope, { enabled: true, dailyRequestLimit: 3 });
    generateStructured.mockRejectedValueOnce(new Error("secret provider error"));
    const failedId = await service.generateSalesDraft(alphaScope, { ...input, requestKey: randomUUID() }, adapter);
    await expect(service.getSalesDraft(alphaScope, failedId)).resolves.toMatchObject({ status: "failed", errorCode: "generation_failed", output: null });
    expect(await db.select().from(aiDraftRuns)).toHaveLength(2);
    await client.close();
  });
});
