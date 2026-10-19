// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { campaignRecipients, campaignSteps, companies, contacts, suppressionEntries, users, workspaceMembers, workspaces } from "@/server/db/schema";

describe("campaign preparation persistence", () => {
  it("enforces idempotency, tenant/role isolation, current suppression and review reset", async () => {
    const client = new PGlite(); const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [owner, sales, developer, viewer] = await db.insert(users).values(["owner", "sales", "developer", "viewer"].map((name) => ({ email: `${name}@campaign-test.example` }))).returning();
    const [alpha, beta] = await db.insert(workspaces).values([{ name: "Alpha", slug: "m8-alpha" }, { name: "Beta", slug: "m8-beta" }]).returning();
    if (!owner || !sales || !developer || !viewer || !alpha || !beta) throw Error("fixtures");
    await db.insert(workspaceMembers).values([
      { workspaceId: alpha.id, userId: owner.id, role: "owner", status: "active" },
      { workspaceId: beta.id, userId: owner.id, role: "owner", status: "active" },
      { workspaceId: alpha.id, userId: sales.id, role: "sales", status: "active" },
      { workspaceId: alpha.id, userId: developer.id, role: "developer", status: "active" },
      { workspaceId: alpha.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);
    const scope = createWorkspaceScope({ workspaceId: alpha.id, userId: owner.id, role: "owner" });
    const other = createWorkspaceScope({ workspaceId: beta.id, userId: owner.id, role: "owner" });
    const seller = createWorkspaceScope({ workspaceId: alpha.id, userId: sales.id, role: "sales" });
    const [company, company2] = await db.insert(companies).values([{ workspaceId: alpha.id, name: "One", dedupeKey: "one" }, { workspaceId: alpha.id, name: "Two", dedupeKey: "two" }]).returning();
    if (!company || !company2) throw Error("companies");
    const [contact, duplicate, flagged] = await db.insert(contacts).values([
      { workspaceId: alpha.id, companyId: company.id, firstName: "Test", email: "test@example.com", normalizedEmail: "test@example.com", sourceLabel: "Client referral", observedAt: new Date(), createdByUserId: owner.id },
      { workspaceId: alpha.id, companyId: company2.id, firstName: "Duplicate", email: "test@example.com", normalizedEmail: "test@example.com", sourceLabel: "Client referral", observedAt: new Date(), createdByUserId: owner.id },
      { workspaceId: alpha.id, companyId: company.id, firstName: "Blocked", email: "blocked@example.com", normalizedEmail: "blocked@example.com", doNotContact: true, sourceLabel: "Client referral", observedAt: new Date(), createdByUserId: owner.id },
    ]).returning();
    if (!contact || !duplicate || !flagged) throw Error("contacts");
    vi.resetModules(); vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const s = await import("./service");
    const input = { name: "Evidence-led campaign", dailyRecipientCap: 10, requestKey: randomUUID() };
    const id = await s.createCampaign(seller, input);
    expect(await s.createCampaign(seller, input)).toBe(id);
    await expect(s.createCampaign(seller, { ...input, name: "Changed request" })).rejects.toThrow("different");
    for (const member of [{ userId: developer.id, role: "developer" as const }, { userId: viewer.id, role: "viewer" as const }]) {
      await expect(s.createCampaign(createWorkspaceScope({ workspaceId: alpha.id, ...member }), { ...input, requestKey: randomUUID() })).rejects.toThrow("role");
    }
    await expect(s.getCampaign(other, id)).resolves.toBeNull();
    const templateId = await s.createCampaignTemplate(seller, { name: "Introduction", subject: "Proposed conversation", body: "Would you be open to reviewing the recorded findings?" });
    await expect(s.saveCampaignStep(other, { campaignId: id, templateId, position: 1, delayDays: 0 })).rejects.toThrow("active workspace");
    const foreignTemplate = await s.createCampaignTemplate(other, { name: "Other", subject: "Other draft", body: "Other workspace content." });
    await expect(s.saveCampaignStep(scope, { campaignId: id, templateId: foreignTemplate, position: 1, delayDays: 0 })).rejects.toThrow("template");
    await s.saveCampaignStep(seller, { campaignId: id, templateId, position: 1, delayDays: 0 });
    const enrollment = { campaignId: id, contactId: contact.id, contactBasis: "Documented existing client relationship for review" };
    expect(await s.enrollCampaignRecipient(seller, enrollment)).toBe(true);
    expect(await s.enrollCampaignRecipient(seller, enrollment)).toBe(false);
    expect(await s.enrollCampaignRecipient(seller, { ...enrollment, contactId: duplicate.id })).toBe(false);
    await expect(s.enrollCampaignRecipient(scope, { ...enrollment, contactId: flagged.id })).rejects.toThrow("do not contact");
    await expect(s.reviewCampaign(seller, { campaignId: id, note: "Reviewed the sequence and audience" })).rejects.toThrow("role");
    await s.reviewCampaign(scope, { campaignId: id, note: "Reviewed the sequence and audience" });
    expect((await s.getCampaign(scope, id))?.campaign.status).toBe("reviewed");
    expect((await s.getCampaign(scope, id))?.deliveryBlockers.length).toBeGreaterThan(0);
    await db.insert(suppressionEntries).values({ workspaceId: alpha.id, contactId: contact.id, channel: "email", normalizedValue: "test@example.com", reason: "Opt-out request", createdByUserId: owner.id });
    expect((await s.getCampaign(scope, id))?.recipients[0]?.blockedReasons).toContain("Workspace suppression");
    await s.saveCampaignStep(scope, { campaignId: id, templateId, position: 1, delayDays: 1 });
    expect((await s.getCampaign(scope, id))?.campaign.status).toBe("draft");
    await expect(s.reviewCampaign(scope, { campaignId: id, note: "Rechecking current readiness" })).rejects.toThrow("blocked recipients");
    await db.update(contacts).set({ normalizedEmail: "changed@example.com", email: "changed@example.com" }).where(eq(contacts.id, contact.id));
    expect((await s.getCampaign(scope, id))?.recipients[0]?.blockedReasons).toContain("Email changed since enrollment");
    await expect(db.insert(campaignSteps).values({ workspaceId: beta.id, campaignId: id, templateId: foreignTemplate, position: 1, delayDays: 0 })).rejects.toThrow();
    const [recipient] = await db.select().from(campaignRecipients);
    await s.removeCampaignEnrollment(scope, { campaignId: id, recipientId: recipient!.id });
    expect((await s.getCampaign(scope, id))?.recipients).toHaveLength(0);
    expect(await db.select().from(suppressionEntries)).toHaveLength(1);
    await s.enrollCampaignRecipient(scope, enrollment);
    await s.reviewCampaign(scope, { campaignId: id, note: "Reviewed the corrected email and sequence" });
    expect((await s.getCampaign(scope, id))?.campaign.status).toBe("reviewed");
    const currentStep = (await s.getCampaign(scope, id))!.steps[0]!;
    await expect(s.removeCampaignStep(other, { campaignId: id, stepId: currentStep.id })).rejects.toThrow("active workspace");
    await s.removeCampaignStep(scope, { campaignId: id, stepId: currentStep.id });
    expect((await s.getCampaign(scope, id))?.steps).toHaveLength(0);
    expect((await s.getCampaign(scope, id))?.campaign.status).toBe("draft");
    await client.close();
  });
});
