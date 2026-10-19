import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { campaignReviewSchema, campaignSchema, deliveryBlockers, preparationIssues, recipientSchema, removeEnrollmentSchema, removeStepSchema, stepSchema, templateSchema } from "@/modules/campaigns/validation";
import { getDatabase, type Database } from "@/server/db";
import { auditLogs, campaignRecipients, campaigns, campaignSteps, campaignTemplates, contacts, suppressionEntries, workspaceMembers, workspaces } from "@/server/db/schema";

export class CampaignError extends Error {}
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function canPrepareCampaign(scope: WorkspaceScope) { return ["owner", "admin", "sales"].includes(scope.role); }

async function authorize(tx: Transaction, scope: WorkspaceScope, review = false) {
  if (!canPrepareCampaign(scope) || (review && scope.role !== "owner" && scope.role !== "admin")) throw new CampaignError("Your role cannot perform this campaign action.");
  await tx.execute(sql`select id from workspaces where id = ${scope.workspaceId} for update`);
  const [member] = await tx.select({ role: workspaceMembers.role }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, scope.workspaceId), eq(workspaceMembers.userId, scope.userId), eq(workspaceMembers.status, "active"), eq(workspaces.status, "active"))).limit(1);
  if (!member || member.role !== scope.role) throw new CampaignError("Workspace membership changed. Refresh and try again.");
}

async function requireCampaign(tx: Transaction, scope: WorkspaceScope, id: string) {
  const [campaign] = await tx.select().from(campaigns).where(and(eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.id, id))).limit(1);
  if (!campaign) throw new CampaignError("Choose a campaign in the active workspace.");
  if (campaign.stagedAt) throw new CampaignError("This campaign has immutable staged messages and can no longer be edited.");
  return campaign;
}

async function resetReview(tx: Transaction, scope: WorkspaceScope, id: string) {
  await tx.update(campaigns).set({ status: "draft", reviewedAt: null, reviewedByUserId: null, reviewNote: null, updatedAt: new Date() }).where(and(eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.id, id)));
}

async function event(tx: Transaction, scope: WorkspaceScope, action: string, id: string) {
  await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: `campaign.${action}`, targetType: "campaign", targetId: id });
}

export async function createCampaign(scope: WorkspaceScope, input: unknown) {
  const parsed = campaignSchema.parse(input);
  return getDatabase().transaction(async (tx) => {
    await authorize(tx, scope);
    const [existing] = await tx.select().from(campaigns).where(and(eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.requestKey, parsed.requestKey))).limit(1);
    if (existing) {
      if (existing.name !== parsed.name || existing.dailyRecipientCap !== parsed.dailyRecipientCap) throw new CampaignError("This request key was already used for different campaign details.");
      return existing.id;
    }
    const [campaign] = await tx.insert(campaigns).values({ workspaceId: scope.workspaceId, ...parsed, createdByUserId: scope.userId }).returning({ id: campaigns.id });
    if (!campaign) throw new CampaignError("Campaign creation failed.");
    await event(tx, scope, "created", campaign.id);
    return campaign.id;
  });
}

export async function createCampaignTemplate(scope: WorkspaceScope, input: unknown) {
  const parsed = templateSchema.parse(input);
  return getDatabase().transaction(async (tx) => {
    await authorize(tx, scope);
    const [template] = await tx.insert(campaignTemplates).values({ workspaceId: scope.workspaceId, ...parsed, createdByUserId: scope.userId }).returning({ id: campaignTemplates.id });
    if (!template) throw new CampaignError("Template creation failed.");
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "campaign.template_created", targetType: "campaign_template", targetId: template.id });
    return template.id;
  });
}

export async function saveCampaignStep(scope: WorkspaceScope, input: unknown) {
  const parsed = stepSchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    await authorize(tx, scope); await requireCampaign(tx, scope, parsed.campaignId);
    const [template] = await tx.select({ id: campaignTemplates.id }).from(campaignTemplates).where(and(eq(campaignTemplates.workspaceId, scope.workspaceId), eq(campaignTemplates.id, parsed.templateId))).limit(1);
    if (!template) throw new CampaignError("Choose a template in the active workspace.");
    await tx.insert(campaignSteps).values({ workspaceId: scope.workspaceId, ...parsed }).onConflictDoUpdate({ target: [campaignSteps.workspaceId, campaignSteps.campaignId, campaignSteps.position], set: { templateId: parsed.templateId, delayDays: parsed.delayDays } });
    await resetReview(tx, scope, parsed.campaignId); await event(tx, scope, "step_saved", parsed.campaignId);
  });
}

export async function enrollCampaignRecipient(scope: WorkspaceScope, input: unknown) {
  const parsed = recipientSchema.parse(input);
  return getDatabase().transaction(async (tx) => {
    await authorize(tx, scope); await requireCampaign(tx, scope, parsed.campaignId);
    const [contact] = await tx.select().from(contacts).where(and(eq(contacts.workspaceId, scope.workspaceId), eq(contacts.id, parsed.contactId))).limit(1);
    if (!contact?.normalizedEmail || contact.doNotContact) throw new CampaignError("This contact has no usable business email or is marked do not contact.");
    const [suppressed] = await tx.select({ id: suppressionEntries.id }).from(suppressionEntries).where(and(eq(suppressionEntries.workspaceId, scope.workspaceId), eq(suppressionEntries.channel, "email"), eq(suppressionEntries.normalizedValue, contact.normalizedEmail))).limit(1);
    if (suppressed) throw new CampaignError("This email address is suppressed in the workspace.");
    const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(campaignRecipients).where(and(eq(campaignRecipients.workspaceId, scope.workspaceId), eq(campaignRecipients.campaignId, parsed.campaignId)));
    const [existing] = await tx.select({ id: campaignRecipients.id }).from(campaignRecipients).where(and(eq(campaignRecipients.workspaceId, scope.workspaceId), eq(campaignRecipients.campaignId, parsed.campaignId), eq(campaignRecipients.normalizedEmail, contact.normalizedEmail))).limit(1);
    if (existing) return false;
    if ((count?.count ?? 0) >= 100) throw new CampaignError("Campaigns are limited to 100 enrolled contacts in this preparation workflow.");
    const [enrolled] = await tx.insert(campaignRecipients).values({ workspaceId: scope.workspaceId, ...parsed, normalizedEmail: contact.normalizedEmail, createdByUserId: scope.userId }).onConflictDoNothing().returning({ id: campaignRecipients.id });
    if (!enrolled) return false;
    await resetReview(tx, scope, parsed.campaignId); await event(tx, scope, "recipient_enrolled", parsed.campaignId);
    return true;
  });
}

export async function campaignDetails(db: Database | Transaction, scope: WorkspaceScope, id: string) {
  const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.id, id))).limit(1);
  if (!campaign) return null;
  const steps = await db.select({ id: campaignSteps.id, position: campaignSteps.position, delayDays: campaignSteps.delayDays, subject: campaignTemplates.subject, body: campaignTemplates.body, templateName: campaignTemplates.name }).from(campaignSteps)
    .innerJoin(campaignTemplates, and(eq(campaignTemplates.workspaceId, campaignSteps.workspaceId), eq(campaignTemplates.id, campaignSteps.templateId)))
    .where(and(eq(campaignSteps.workspaceId, scope.workspaceId), eq(campaignSteps.campaignId, id))).orderBy(campaignSteps.position);
  const rows = await db.select({ id: campaignRecipients.id, email: campaignRecipients.normalizedEmail, currentEmail: contacts.normalizedEmail, name: contacts.firstName, doNotContact: contacts.doNotContact, contactBasis: campaignRecipients.contactBasis }).from(campaignRecipients)
    .innerJoin(contacts, and(eq(contacts.workspaceId, campaignRecipients.workspaceId), eq(contacts.id, campaignRecipients.contactId)))
    .where(and(eq(campaignRecipients.workspaceId, scope.workspaceId), eq(campaignRecipients.campaignId, id))).orderBy(campaignRecipients.createdAt);
  const emailValues = [...new Set(rows.flatMap((row) => [row.email, row.currentEmail].filter((value): value is string => Boolean(value))))];
  const suppressed = emailValues.length ? await db.select({ value: suppressionEntries.normalizedValue }).from(suppressionEntries).where(and(eq(suppressionEntries.workspaceId, scope.workspaceId), eq(suppressionEntries.channel, "email"), inArray(suppressionEntries.normalizedValue, emailValues))) : [];
  const values = new Set(suppressed.map((item) => item.value));
  const recipients = rows.map((row) => ({ ...row, blockedReasons: [row.doNotContact ? "Do not contact" : null, values.has(row.email) || (row.currentEmail && values.has(row.currentEmail)) ? "Workspace suppression" : null, row.currentEmail !== row.email ? "Email changed since enrollment" : null].filter((value): value is string => Boolean(value)) }));
  return { campaign, steps, recipients, issues: preparationIssues(steps, recipients, campaign.dailyRecipientCap), deliveryBlockers };
}

export async function reviewCampaign(scope: WorkspaceScope, input: unknown) {
  const parsed = campaignReviewSchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    await authorize(tx, scope, true);
    const result = await campaignDetails(tx, scope, parsed.campaignId);
    if (!result) throw new CampaignError("Choose a campaign in the active workspace.");
    if (result.issues.length) throw new CampaignError(result.issues.join(" "));
    const [updated] = await tx.update(campaigns).set({ status: "reviewed", reviewedByUserId: scope.userId, reviewNote: parsed.note, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(campaigns.workspaceId, scope.workspaceId), eq(campaigns.id, parsed.campaignId), eq(campaigns.status, "draft"))).returning({ id: campaigns.id });
    if (!updated) throw new CampaignError("This campaign has already been reviewed. Changes require a new review.");
    await event(tx, scope, "reviewed_for_preparation", parsed.campaignId);
  });
}

export async function removeCampaignEnrollment(scope: WorkspaceScope, input: unknown) {
  const parsed = removeEnrollmentSchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    await authorize(tx, scope); await requireCampaign(tx, scope, parsed.campaignId);
    const [removed] = await tx.delete(campaignRecipients).where(and(eq(campaignRecipients.workspaceId, scope.workspaceId), eq(campaignRecipients.campaignId, parsed.campaignId), eq(campaignRecipients.id, parsed.recipientId))).returning({ id: campaignRecipients.id });
    if (!removed) throw new CampaignError("Choose an enrollment in this campaign.");
    await resetReview(tx, scope, parsed.campaignId); await event(tx, scope, "recipient_removed", parsed.campaignId);
  });
}

export async function removeCampaignStep(scope: WorkspaceScope, input: unknown) {
  const parsed = removeStepSchema.parse(input);
  await getDatabase().transaction(async (tx) => {
    await authorize(tx, scope); await requireCampaign(tx, scope, parsed.campaignId);
    const [removed] = await tx.delete(campaignSteps).where(and(eq(campaignSteps.workspaceId, scope.workspaceId), eq(campaignSteps.campaignId, parsed.campaignId), eq(campaignSteps.id, parsed.stepId))).returning({ id: campaignSteps.id });
    if (!removed) throw new CampaignError("Choose a step in this campaign.");
    await resetReview(tx, scope, parsed.campaignId); await event(tx, scope, "step_removed", parsed.campaignId);
  });
}

export function listCampaigns(scope: WorkspaceScope) { return getDatabase().select().from(campaigns).where(eq(campaigns.workspaceId, scope.workspaceId)).orderBy(desc(campaigns.updatedAt)).limit(100); }
export function listCampaignTemplates(scope: WorkspaceScope) { return getDatabase().select().from(campaignTemplates).where(eq(campaignTemplates.workspaceId, scope.workspaceId)).orderBy(desc(campaignTemplates.createdAt)).limit(100); }
export function getCampaign(scope: WorkspaceScope, id: string) { return campaignDetails(getDatabase(), scope, id); }
