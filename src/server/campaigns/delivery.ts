import { createHash, createHmac } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { CampaignEmailProvider } from "@/modules/campaigns/delivery";
import { CampaignProviderError } from "@/modules/campaigns/delivery";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase, type Database } from "@/server/db";
import {
  auditLogs,
  campaignMessages,
  campaignProviderEvents,
  campaignRecipients,
  campaigns,
  campaignUnsubscribeTokens,
  contacts,
  suppressionEntries,
  workspaceMembers,
  workspaces,
} from "@/server/db/schema";
import { campaignDetails } from "./service";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class CampaignDeliveryError extends Error {
  constructor(message: string) { super(message); this.name = "CampaignDeliveryError"; }
}

const eventSchema = z.object({
  signatureVerified: z.literal(true),
  provider: z.string().trim().min(2).max(100),
  externalEventId: z.string().trim().min(1).max(300),
  providerMessageId: z.string().trim().min(1).max(500),
  kind: z.enum(["delivered", "bounced", "complained", "unsubscribed"]),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  occurredAt: z.date(),
});

function requireTokenSecret(secret: string) {
  if (Buffer.byteLength(secret) < 32) throw new CampaignDeliveryError("The unsubscribe secret must contain at least 32 bytes.");
}

export function unsubscribeTokenForMessage(messageId: string, secret: string) {
  requireTokenSecret(secret);
  const signature = createHmac("sha256", secret).update(messageId).digest("base64url");
  return `${messageId}.${signature}`;
}

export function hashUnsubscribeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function authorizeAdmin(tx: Transaction, scope: WorkspaceScope) {
  if (scope.role !== "owner" && scope.role !== "admin") throw new CampaignDeliveryError("Only an Owner or Admin can stage campaign delivery.");
  await tx.execute(sql`select id from workspaces where id = ${scope.workspaceId} for update`);
  const [member] = await tx.select({ role: workspaceMembers.role }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, scope.workspaceId), eq(workspaceMembers.userId, scope.userId), eq(workspaceMembers.status, "active"), eq(workspaces.status, "active"))).limit(1);
  if (!member || member.role !== scope.role) throw new CampaignDeliveryError("Workspace membership changed. Refresh and try again.");
}

export async function materializeCampaignMessages(scope: WorkspaceScope, campaignId: string, tokenSecret: string, now = new Date()) {
  requireTokenSecret(tokenSecret);
  return getDatabase().transaction(async (tx) => {
    await authorizeAdmin(tx, scope);
    const result = await campaignDetails(tx, scope, campaignId);
    if (!result) throw new CampaignDeliveryError("Choose a campaign in the active workspace.");
    if (result.campaign.stagedAt) {
      const rows = await tx.select({ id: campaignMessages.id }).from(campaignMessages).where(and(eq(campaignMessages.workspaceId, scope.workspaceId), eq(campaignMessages.campaignId, campaignId)));
      return { created: 0, total: rows.length } as const;
    }
    if (result.campaign.status !== "reviewed" || result.issues.length) throw new CampaignDeliveryError("The campaign must pass current readiness checks and human review before staging.");

    let created = 0;
    for (const step of result.steps) {
      for (const recipient of result.recipients) {
        const scheduledFor = new Date(now.getTime() + step.delayDays * 86_400_000);
        const [message] = await tx.insert(campaignMessages).values({
          workspaceId: scope.workspaceId,
          campaignId,
          stepId: step.id,
          recipientId: recipient.id,
          normalizedEmail: recipient.email,
          subject: step.subject,
          body: step.body,
          scheduledFor,
        }).onConflictDoNothing({ target: [campaignMessages.workspaceId, campaignMessages.campaignId, campaignMessages.stepId, campaignMessages.recipientId] })
          .returning({ id: campaignMessages.id });
        if (!message) continue;
        const rawToken = unsubscribeTokenForMessage(message.id, tokenSecret);
        await tx.insert(campaignUnsubscribeTokens).values({
          workspaceId: scope.workspaceId,
          messageId: message.id,
          normalizedEmail: recipient.email,
          tokenHash: hashUnsubscribeToken(rawToken),
          expiresAt: new Date(now.getTime() + 365 * 86_400_000),
        });
        created += 1;
      }
    }
    const [staged] = await tx.update(campaigns).set({ stagedAt: now, updatedAt: now }).where(and(
      eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.id, campaignId), eq(campaigns.status, "reviewed"),
    )).returning({ id: campaigns.id });
    if (!staged) throw new CampaignDeliveryError("Campaign review changed while delivery was being staged.");
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      action: "campaign.delivery_staged",
      targetType: "campaign",
      targetId: campaignId,
      metadata: { messageCount: created },
    });
    return { created, total: created } as const;
  });
}

type ClaimedMessage = Readonly<{
  id: string;
  workspaceId: string;
  campaignId: string;
  recipientId: string;
  normalizedEmail: string;
  subject: string;
  body: string;
  providerIdempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  dailyRecipientCap: number;
}>;

export async function claimNextCampaignMessage(workerId: string, now = new Date()): Promise<ClaimedMessage | null> {
  if (!workerId.trim() || workerId.length > 100) throw new CampaignDeliveryError("Worker ID must contain 1 to 100 characters.");
  const utcDate = now.toISOString().slice(0, 10);
  return getDatabase().transaction(async (tx) => {
    await tx.update(campaignMessages).set({
      status: "failed",
      leaseUntil: null,
      workerId: null,
      lastErrorCode: "lease_expired_after_final_attempt",
      updatedAt: now,
    }).where(and(
      eq(campaignMessages.status, "processing"),
      sql`${campaignMessages.leaseUntil} < ${now}`,
      sql`${campaignMessages.attempts} >= ${campaignMessages.maxAttempts}`,
    ));
    const candidateResult = await tx.execute<ClaimedMessage>(sql`
      select message.id, message.workspace_id as "workspaceId", message.campaign_id as "campaignId",
             message.recipient_id as "recipientId", message.normalized_email as "normalizedEmail",
             message.subject, message.body, message.provider_idempotency_key as "providerIdempotencyKey",
             message.attempts, message.max_attempts as "maxAttempts", campaign.daily_recipient_cap as "dailyRecipientCap"
      from campaign_messages message
      inner join campaigns campaign on campaign.workspace_id = message.workspace_id and campaign.id = message.campaign_id
      left join campaign_delivery_usage usage on usage.workspace_id = message.workspace_id
        and usage.campaign_id = message.campaign_id and usage.utc_date = ${utcDate}
      where campaign.status = 'reviewed' and campaign.staged_at is not null
        and coalesce(usage.reserved_attempts, 0) < campaign.daily_recipient_cap
        and message.attempts < message.max_attempts
        and message.scheduled_for <= ${now}
        and ((message.status in ('queued', 'failed')) or (message.status = 'processing' and message.lease_until < ${now}))
      order by message.scheduled_for asc, message.created_at asc
      for update of message skip locked
      limit 1
    `);
    const candidate = candidateResult.rows[0];
    if (!candidate) return null;
    const usageResult = await tx.execute<{ reservedAttempts: number }>(sql`
      insert into campaign_delivery_usage (workspace_id, campaign_id, utc_date, reserved_attempts)
      values (${candidate.workspaceId}, ${candidate.campaignId}, ${utcDate}, 1)
      on conflict (workspace_id, campaign_id, utc_date) do update
      set reserved_attempts = campaign_delivery_usage.reserved_attempts + 1, updated_at = now()
      where campaign_delivery_usage.reserved_attempts < ${candidate.dailyRecipientCap}
      returning reserved_attempts as "reservedAttempts"
    `);
    if (!usageResult.rows[0]) return null;
    const [claimed] = await tx.update(campaignMessages).set({
      status: "processing",
      attempts: sql`${campaignMessages.attempts} + 1`,
      leaseUntil: new Date(now.getTime() + 120_000),
      workerId,
      lastErrorCode: null,
      updatedAt: now,
    }).where(and(eq(campaignMessages.id, candidate.id), eq(campaignMessages.workspaceId, candidate.workspaceId)))
      .returning({ attempts: campaignMessages.attempts });
    return claimed ? { ...candidate, attempts: claimed.attempts } : null;
  });
}

async function suppressMessage(message: ClaimedMessage, workerId: string, code: string, now: Date) {
  await getDatabase().update(campaignMessages).set({ status: "suppressed", leaseUntil: null, workerId: null, lastErrorCode: code, updatedAt: now }).where(and(
    eq(campaignMessages.id, message.id), eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.status, "processing"), eq(campaignMessages.workerId, workerId),
  ));
}

async function isStillDeliverable(message: ClaimedMessage, workerId: string) {
  const db = getDatabase();
  const [row] = await db.select({
    status: campaignMessages.status,
    workerId: campaignMessages.workerId,
    campaignStatus: campaigns.status,
    stagedAt: campaigns.stagedAt,
    snapshotEmail: campaignRecipients.normalizedEmail,
    currentEmail: contacts.normalizedEmail,
    doNotContact: contacts.doNotContact,
  }).from(campaignMessages)
    .innerJoin(campaigns, and(eq(campaigns.workspaceId, campaignMessages.workspaceId), eq(campaigns.id, campaignMessages.campaignId)))
    .innerJoin(campaignRecipients, and(eq(campaignRecipients.workspaceId, campaignMessages.workspaceId), eq(campaignRecipients.id, campaignMessages.recipientId)))
    .innerJoin(contacts, and(eq(contacts.workspaceId, campaignRecipients.workspaceId), eq(contacts.id, campaignRecipients.contactId)))
    .where(and(eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.id, message.id))).limit(1);
  if (!row || row.status !== "processing" || row.workerId !== workerId || row.campaignStatus !== "reviewed" || !row.stagedAt || row.snapshotEmail !== message.normalizedEmail || row.currentEmail !== message.normalizedEmail || row.doNotContact) return false;
  const [suppressed] = await db.select({ id: suppressionEntries.id }).from(suppressionEntries).where(and(
    eq(suppressionEntries.workspaceId, message.workspaceId), eq(suppressionEntries.channel, "email"), eq(suppressionEntries.normalizedValue, message.normalizedEmail),
  )).limit(1);
  return !suppressed;
}

export async function processNextCampaignMessage(provider: CampaignEmailProvider, workerId: string, options: {
  enabled: boolean;
  unsubscribeBaseUrl: string;
  tokenSecret: string;
  now?: Date | undefined;
}) {
  if (!options.enabled) throw new CampaignDeliveryError("Campaign delivery is disabled.");
  if (provider.id === "disabled") throw new CampaignDeliveryError("A reviewed email provider adapter is required.");
  if (!/^[a-zA-Z0-9._-]{2,100}$/.test(provider.id)) throw new CampaignDeliveryError("Provider ID is invalid.");
  requireTokenSecret(options.tokenSecret);
  const baseUrl = new URL(options.unsubscribeBaseUrl);
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "127.0.0.1" && baseUrl.hostname !== "localhost") throw new CampaignDeliveryError("The unsubscribe base URL must use HTTPS.");
  const now = options.now ?? new Date();
  const message = await claimNextCampaignMessage(workerId, now);
  if (!message) return null;
  if (!await isStillDeliverable(message, workerId)) {
    await suppressMessage(message, workerId, "suppressed_before_send", now);
    return { messageId: message.id, status: "suppressed" } as const;
  }
  try {
    const token = unsubscribeTokenForMessage(message.id, options.tokenSecret);
    const [storedToken] = await getDatabase().select({ id: campaignUnsubscribeTokens.id }).from(campaignUnsubscribeTokens).where(and(
      eq(campaignUnsubscribeTokens.workspaceId, message.workspaceId),
      eq(campaignUnsubscribeTokens.messageId, message.id),
      eq(campaignUnsubscribeTokens.tokenHash, hashUnsubscribeToken(token)),
      sql`${campaignUnsubscribeTokens.usedAt} is null`,
      sql`${campaignUnsubscribeTokens.expiresAt} > ${now}`,
    )).limit(1);
    if (!storedToken) throw new CampaignProviderError("unsubscribe_token_unavailable", true, "A usable unsubscribe token is required before delivery.");
    const unsubscribeUrl = new URL(`/unsubscribe/${encodeURIComponent(token)}`, baseUrl).toString();
    const result = await provider.send({
      to: message.normalizedEmail,
      subject: message.subject,
      body: message.body,
      unsubscribeUrl,
      idempotencyKey: message.providerIdempotencyKey,
    });
    if (!result.providerMessageId || result.providerMessageId.length > 500) throw new CampaignProviderError("invalid_provider_response", false);
    const [sent] = await getDatabase().update(campaignMessages).set({
      status: "sent",
      provider: provider.id,
      providerMessageId: result.providerMessageId,
      sentAt: now,
      leaseUntil: null,
      workerId: null,
      updatedAt: now,
    }).where(and(eq(campaignMessages.id, message.id), eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.status, "processing"), eq(campaignMessages.workerId, workerId)))
      .returning({ id: campaignMessages.id });
    if (!sent) throw new CampaignDeliveryError("The claimed message changed before delivery could be recorded.");
    return { messageId: message.id, status: "sent" } as const;
  } catch (error) {
    const providerError = error instanceof CampaignProviderError ? error : new CampaignProviderError("provider_error", true);
    const terminal = !providerError.retryable || message.attempts >= message.maxAttempts;
    await getDatabase().update(campaignMessages).set({
      status: terminal ? "failed" : "failed",
      attempts: terminal ? message.maxAttempts : message.attempts,
      scheduledFor: new Date(now.getTime() + Math.min(60, 2 ** message.attempts) * 60_000),
      leaseUntil: null,
      workerId: null,
      lastErrorCode: providerError.code.slice(0, 100),
      updatedAt: now,
    }).where(and(eq(campaignMessages.id, message.id), eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.status, "processing"), eq(campaignMessages.workerId, workerId)));
    return { messageId: message.id, status: terminal ? "failed" : "retry_scheduled" } as const;
  }
}

export async function consumeUnsubscribeToken(rawToken: string, now = new Date()) {
  if (rawToken.length < 50 || rawToken.length > 200 || !/^[A-Za-z0-9._-]+$/.test(rawToken)) throw new CampaignDeliveryError("This unsubscribe link is invalid or expired.");
  const tokenHash = hashUnsubscribeToken(rawToken);
  return getDatabase().transaction(async (tx) => {
    const [token] = await tx.update(campaignUnsubscribeTokens).set({ usedAt: now }).where(and(
      eq(campaignUnsubscribeTokens.tokenHash, tokenHash),
      sql`${campaignUnsubscribeTokens.usedAt} is null`,
      sql`${campaignUnsubscribeTokens.expiresAt} > ${now}`,
    )).returning();
    if (!token) {
      const [existing] = await tx.select({ usedAt: campaignUnsubscribeTokens.usedAt }).from(campaignUnsubscribeTokens).where(eq(campaignUnsubscribeTokens.tokenHash, tokenHash)).limit(1);
      if (existing?.usedAt) return { alreadySuppressed: true } as const;
      throw new CampaignDeliveryError("This unsubscribe link is invalid or expired.");
    }
    await tx.insert(suppressionEntries).values({
      workspaceId: token.workspaceId,
      channel: "email",
      normalizedValue: token.normalizedEmail,
      reason: "Recipient unsubscribe request",
      source: "recipient_unsubscribe",
      createdByUserId: null,
    }).onConflictDoNothing({ target: [suppressionEntries.workspaceId, suppressionEntries.channel, suppressionEntries.normalizedValue] });
    await tx.update(contacts).set({ doNotContact: true, updatedAt: now }).where(and(eq(contacts.workspaceId, token.workspaceId), eq(contacts.normalizedEmail, token.normalizedEmail)));
    await tx.update(campaignMessages).set({ status: "suppressed", leaseUntil: null, workerId: null, lastErrorCode: "recipient_unsubscribed", updatedAt: now }).where(and(
      eq(campaignMessages.workspaceId, token.workspaceId), eq(campaignMessages.normalizedEmail, token.normalizedEmail), inArray(campaignMessages.status, ["queued", "processing", "failed"]),
    ));
    await tx.insert(auditLogs).values({ workspaceId: token.workspaceId, action: "campaign.recipient_unsubscribed", targetType: "campaign_message", targetId: token.messageId });
    return { alreadySuppressed: false } as const;
  });
}

export async function ingestVerifiedCampaignEvent(input: unknown) {
  const event = eventSchema.parse(input);
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [message] = await tx.select({ id: campaignMessages.id, workspaceId: campaignMessages.workspaceId, normalizedEmail: campaignMessages.normalizedEmail }).from(campaignMessages).where(and(
      eq(campaignMessages.provider, event.provider), eq(campaignMessages.providerMessageId, event.providerMessageId),
    )).limit(1);
    if (!message) throw new CampaignDeliveryError("The provider event does not match a known message.");
    const [stored] = await tx.insert(campaignProviderEvents).values({
      workspaceId: message.workspaceId,
      messageId: message.id,
      provider: event.provider,
      externalEventId: event.externalEventId,
      kind: event.kind,
      payloadHash: event.payloadHash,
      occurredAt: event.occurredAt,
    }).onConflictDoNothing({ target: [campaignProviderEvents.provider, campaignProviderEvents.externalEventId] }).returning({ id: campaignProviderEvents.id });
    if (!stored) return { created: false } as const;

    const nextStatus = event.kind === "unsubscribed" ? "suppressed" : event.kind;
    await tx.update(campaignMessages).set({
      status: nextStatus,
      deliveredAt: event.kind === "delivered" ? event.occurredAt : undefined,
      bouncedAt: event.kind === "bounced" ? event.occurredAt : undefined,
      updatedAt: new Date(),
    }).where(and(eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.id, message.id), inArray(campaignMessages.status, ["sent", "delivered"])));
    if (event.kind !== "delivered") {
      const source = event.kind === "bounced" ? "provider_bounce" : event.kind === "complained" ? "provider_complaint" : "recipient_unsubscribe";
      await tx.insert(suppressionEntries).values({
        workspaceId: message.workspaceId,
        channel: "email",
        normalizedValue: message.normalizedEmail,
        reason: event.kind === "bounced" ? "Provider reported a bounce" : event.kind === "complained" ? "Provider reported a complaint" : "Provider reported an unsubscribe",
        source,
        createdByUserId: null,
      }).onConflictDoNothing({ target: [suppressionEntries.workspaceId, suppressionEntries.channel, suppressionEntries.normalizedValue] });
      await tx.update(contacts).set({ doNotContact: true, updatedAt: new Date() }).where(and(eq(contacts.workspaceId, message.workspaceId), eq(contacts.normalizedEmail, message.normalizedEmail)));
      await tx.update(campaignMessages).set({ status: "suppressed", leaseUntil: null, workerId: null, updatedAt: new Date() }).where(and(
        eq(campaignMessages.workspaceId, message.workspaceId), eq(campaignMessages.normalizedEmail, message.normalizedEmail), inArray(campaignMessages.status, ["queued", "processing", "failed"]),
      ));
    }
    await tx.insert(auditLogs).values({ workspaceId: message.workspaceId, action: `campaign.provider_${event.kind}`, targetType: "campaign_message", targetId: message.id, metadata: { provider: event.provider } });
    return { created: true } as const;
  });
}
