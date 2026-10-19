// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { CampaignEmailProvider, CampaignDeliveryMessage } from "@/modules/campaigns/delivery";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import {
  campaignDeliveryUsage,
  campaignMessages,
  campaignProviderEvents,
  campaignUnsubscribeTokens,
  companies,
  contacts,
  suppressionEntries,
  users,
  workspaceMembers,
  workspaces,
} from "@/server/db/schema";

describe("campaign delivery control plane", () => {
  it("stages immutably, caps leased sends, reconciles events and suppresses replays", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [owner, sales] = await db.insert(users).values([{ email: "delivery-owner@example.com" }, { email: "delivery-sales@example.com" }]).returning();
    const [alpha, beta] = await db.insert(workspaces).values([{ name: "Alpha", slug: "delivery-alpha" }, { name: "Beta", slug: "delivery-beta" }]).returning();
    if (!owner || !sales || !alpha || !beta) throw new Error("fixtures");
    await db.insert(workspaceMembers).values([
      { workspaceId: alpha.id, userId: owner.id, role: "owner", status: "active" },
      { workspaceId: beta.id, userId: owner.id, role: "owner", status: "active" },
      { workspaceId: alpha.id, userId: sales.id, role: "sales", status: "active" },
    ]);
    const [company] = await db.insert(companies).values({ workspaceId: alpha.id, name: "Client", dedupeKey: "delivery-client" }).returning();
    if (!company) throw new Error("company fixture");
    const [first, second] = await db.insert(contacts).values([
      { workspaceId: alpha.id, companyId: company.id, firstName: "First", email: "first@example.com", normalizedEmail: "first@example.com", sourceLabel: "Existing client", observedAt: new Date(), createdByUserId: owner.id },
      { workspaceId: alpha.id, companyId: company.id, firstName: "Second", email: "second@example.com", normalizedEmail: "second@example.com", sourceLabel: "Existing client", observedAt: new Date(), createdByUserId: owner.id },
    ]).returning();
    if (!first || !second) throw new Error("contact fixtures");

    vi.resetModules();
    vi.doMock("@/server/db", () => ({ getDatabase: () => db }));
    const preparation = await import("./service");
    const delivery = await import("./delivery");
    const scope = createWorkspaceScope({ workspaceId: alpha.id, userId: owner.id, role: "owner" });
    const salesScope = createWorkspaceScope({ workspaceId: alpha.id, userId: sales.id, role: "sales" });
    const campaignId = await preparation.createCampaign(scope, { name: "Controlled delivery", dailyRecipientCap: 1, requestKey: randomUUID() });
    const templateId = await preparation.createCampaignTemplate(scope, { name: "Introduction", subject: "A relevant proposal", body: "Would you be open to reviewing the evidence with our team?" });
    await preparation.saveCampaignStep(scope, { campaignId, templateId, position: 1, delayDays: 0 });
    await preparation.saveCampaignStep(scope, { campaignId, templateId, position: 2, delayDays: 0 });
    await preparation.enrollCampaignRecipient(scope, { campaignId, contactId: first.id, contactBasis: "Documented existing client relationship" });
    await preparation.reviewCampaign(scope, { campaignId, note: "Owner reviewed the content, audience and contact basis" });
    const secret = "campaign-unsubscribe-test-secret-with-more-than-32-bytes";

    await expect(delivery.materializeCampaignMessages(salesScope, campaignId, secret)).rejects.toThrow("Owner or Admin");
    await expect(delivery.materializeCampaignMessages(scope, campaignId, secret, new Date("2026-10-19T08:00:00Z"))).resolves.toEqual({ created: 2, total: 2 });
    await expect(delivery.materializeCampaignMessages(scope, campaignId, secret)).resolves.toEqual({ created: 0, total: 2 });
    await expect(preparation.saveCampaignStep(scope, { campaignId, templateId, position: 1, delayDays: 1 })).rejects.toThrow("immutable staged");

    const messages = await db.select().from(campaignMessages).where(eq(campaignMessages.campaignId, campaignId));
    const tokens = await db.select().from(campaignUnsubscribeTokens);
    expect(messages).toHaveLength(2);
    expect(tokens).toHaveLength(2);
    expect(tokens.every((token) => /^[a-f0-9]{64}$/.test(token.tokenHash))).toBe(true);
    await expect(db.insert(campaignMessages).values({
      workspaceId: beta.id,
      campaignId,
      stepId: messages[0]!.stepId,
      recipientId: messages[0]!.recipientId,
      normalizedEmail: "foreign@example.com",
      subject: "Foreign message",
      body: "This cross-tenant insert must be rejected.",
      scheduledFor: new Date(),
    })).rejects.toThrow();

    const otherCampaignId = await preparation.createCampaign(scope, { name: "Independent delivery", dailyRecipientCap: 2, requestKey: randomUUID() });
    await preparation.saveCampaignStep(scope, { campaignId: otherCampaignId, templateId, position: 1, delayDays: 0 });
    await preparation.enrollCampaignRecipient(scope, { campaignId: otherCampaignId, contactId: second.id, contactBasis: "Documented existing client relationship" });
    await preparation.reviewCampaign(scope, { campaignId: otherCampaignId, note: "Owner reviewed the second campaign and contact basis" });
    await delivery.materializeCampaignMessages(scope, otherCampaignId, secret, new Date("2026-10-19T08:00:30Z"));

    const sentPayloads: CampaignDeliveryMessage[] = [];
    const provider: CampaignEmailProvider = {
      id: "test-provider",
      async send(message) { sentPayloads.push(message); return { providerMessageId: `provider-${sentPayloads.length}` }; },
    };
    await expect(delivery.processNextCampaignMessage(provider, "worker-1", { enabled: false, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: secret, now: new Date("2026-10-19T08:01:00Z") })).rejects.toThrow("disabled");
    await expect(delivery.processNextCampaignMessage(provider, "worker-1", { enabled: true, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: secret, now: new Date("2026-10-19T08:01:00Z") })).resolves.toMatchObject({ status: "sent" });
    await expect(delivery.processNextCampaignMessage(provider, "worker-2", { enabled: true, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: `${secret}-rotated`, now: new Date("2026-10-19T08:02:00Z") })).resolves.toMatchObject({ status: "retry_scheduled" });
    expect(sentPayloads).toHaveLength(1);
    await expect(delivery.processNextCampaignMessage(provider, "worker-3", { enabled: true, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: secret, now: new Date("2026-10-19T08:10:00Z") })).resolves.toMatchObject({ status: "sent" });
    await expect(delivery.processNextCampaignMessage(provider, "worker-3b", { enabled: true, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: secret, now: new Date("2026-10-19T08:10:30Z") })).resolves.toBeNull();
    expect(sentPayloads).toHaveLength(2);
    expect(sentPayloads[0]?.unsubscribeUrl).toContain("/unsubscribe/");
    expect(await db.select().from(campaignDeliveryUsage)).toHaveLength(2);

    const [stale] = await db.select().from(campaignMessages).where(eq(campaignMessages.status, "queued"));
    if (!stale) throw new Error("stale lease fixture");
    await db.update(campaignMessages).set({ status: "processing", attempts: 3, maxAttempts: 3, leaseUntil: new Date("2026-10-19T08:00:00Z"), workerId: "crashed-worker" }).where(eq(campaignMessages.id, stale.id));
    await expect(delivery.processNextCampaignMessage(provider, "worker-4", { enabled: true, unsubscribeBaseUrl: "http://127.0.0.1:3000", tokenSecret: secret, now: new Date("2026-10-19T08:11:00Z") })).resolves.toBeNull();
    expect((await db.select().from(campaignMessages).where(eq(campaignMessages.id, stale.id)))[0]).toMatchObject({ status: "failed", lastErrorCode: "lease_expired_after_final_attempt", workerId: null });

    const sent = (await db.select().from(campaignMessages).where(eq(campaignMessages.status, "sent"))).find((message) => message.campaignId === campaignId);
    if (!sent) throw new Error("sent fixture");
    const providerEvent = { signatureVerified: true, provider: "test-provider", externalEventId: "event-1", providerMessageId: sent.providerMessageId, kind: "delivered", payloadHash: "a".repeat(64), occurredAt: new Date("2026-10-19T08:03:00Z") } as const;
    await expect(delivery.ingestVerifiedCampaignEvent({ ...providerEvent, signatureVerified: false })).rejects.toThrow();
    await expect(delivery.ingestVerifiedCampaignEvent(providerEvent)).resolves.toEqual({ created: true });
    await expect(delivery.ingestVerifiedCampaignEvent(providerEvent)).resolves.toEqual({ created: false });
    expect(await db.select().from(campaignProviderEvents)).toHaveLength(1);

    const rawToken = delivery.unsubscribeTokenForMessage(sent.id, secret);
    expect(tokens.find((token) => token.messageId === sent.id)?.tokenHash).toBe(delivery.hashUnsubscribeToken(rawToken));
    await expect(delivery.consumeUnsubscribeToken(rawToken, new Date("2026-10-19T08:04:00Z"))).resolves.toEqual({ alreadySuppressed: false });
    await expect(delivery.consumeUnsubscribeToken(rawToken, new Date("2026-10-19T08:05:00Z"))).resolves.toEqual({ alreadySuppressed: true });
    expect(await db.select().from(suppressionEntries)).toMatchObject([{ source: "recipient_unsubscribe", createdByUserId: null }]);
    expect((await db.select().from(contacts).where(eq(contacts.id, sent.normalizedEmail === first.normalizedEmail ? first.id : second.id)))[0]?.doNotContact).toBe(true);
    expect((await db.select().from(campaignMessages).where(eq(campaignMessages.status, "suppressed"))).length).toBeGreaterThanOrEqual(1);
    await client.close();
  });
});
