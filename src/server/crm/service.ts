import { and, eq } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { dealLifecycle, normalizeEmail, normalizePhone, type DealStage } from "@/modules/crm/validation";
import { getDatabase } from "@/server/db";
import {
  auditLogs,
  companies,
  contacts,
  crmActivities,
  crmNotes,
  crmTasks,
  deals,
  leads,
  opportunities,
  suppressionEntries,
  workspaceMembers,
  workspaces,
} from "@/server/db/schema";

export class CrmMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmMutationError";
  }
}

async function requireLead(scope: WorkspaceScope, leadId: string) {
  const [lead] = await getDatabase().select({ id: leads.id, companyId: leads.companyId, title: leads.title })
    .from(leads).where(and(eq(leads.workspaceId, scope.workspaceId), eq(leads.id, leadId))).limit(1);
  if (!lead) throw new CrmMutationError("Choose a lead in the active workspace.");
  return lead;
}

export async function createCrmLead(scope: WorkspaceScope, input: { companyId: string; sourceOpportunityId?: string | undefined; title: string }) {
  const db = getDatabase();
  const [company] = await db.select({ id: companies.id }).from(companies)
    .where(and(eq(companies.workspaceId, scope.workspaceId), eq(companies.id, input.companyId))).limit(1);
  if (!company) throw new CrmMutationError("Choose a company in the active workspace.");
  if (input.sourceOpportunityId) {
    const [source] = await db.select({ id: opportunities.id }).from(opportunities).where(and(
      eq(opportunities.workspaceId, scope.workspaceId),
      eq(opportunities.companyId, input.companyId),
      eq(opportunities.id, input.sourceOpportunityId),
    )).limit(1);
    if (!source) throw new CrmMutationError("Choose an opportunity for this company.");
  }
  const [workspace] = await db.select({ currency: workspaces.currency }).from(workspaces)
    .where(eq(workspaces.id, scope.workspaceId)).limit(1);
  if (!workspace) throw new CrmMutationError("The active workspace is unavailable.");

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(leads).values({
      workspaceId: scope.workspaceId,
      companyId: input.companyId,
      sourceOpportunityId: input.sourceOpportunityId ?? null,
      ownerUserId: scope.userId,
      title: input.title,
    }).onConflictDoNothing({ target: [leads.workspaceId, leads.companyId] }).returning({ id: leads.id });
    if (!created) {
      const [existing] = await tx.select({ id: leads.id }).from(leads).where(and(
        eq(leads.workspaceId, scope.workspaceId), eq(leads.companyId, input.companyId),
      )).limit(1);
      if (!existing) throw new CrmMutationError("The lead could not be created.");
      return { leadId: existing.id, created: false } as const;
    }
    await tx.insert(deals).values({ workspaceId: scope.workspaceId, leadId: created.id, currency: workspace.currency });
    await tx.insert(crmActivities).values({
      workspaceId: scope.workspaceId, leadId: created.id, actorUserId: scope.userId,
      type: "lead_created", summary: "CRM lead created.",
    });
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.lead_created",
      targetType: "lead", targetId: created.id, metadata: { companyId: input.companyId, sourceOpportunityId: input.sourceOpportunityId ?? null },
    });
    return { leadId: created.id, created: true } as const;
  });
}

export async function changeDealStage(scope: WorkspaceScope, input: { leadId: string; stage: DealStage; lostReason?: string | undefined }) {
  if (input.stage === "lost" && !input.lostReason?.trim()) {
    throw new CrmMutationError("Add a brief reason when closing a deal as lost.");
  }
  const lead = await requireLead(scope, input.leadId);
  const db = getDatabase();
  const lifecycle = dealLifecycle(input.stage);
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ stage: deals.stage }).from(deals).where(and(
      eq(deals.workspaceId, scope.workspaceId), eq(deals.leadId, lead.id),
    )).limit(1);
    if (!current) throw new CrmMutationError("The lead pipeline record is unavailable.");
    if (current.stage === input.stage) return { changed: false } as const;
    const [updated] = await tx.update(deals).set({
      stage: input.stage,
      closedAt: lifecycle.closedAt,
      lostReason: input.stage === "lost" ? input.lostReason ?? null : null,
      updatedAt: new Date(),
    }).where(and(eq(deals.workspaceId, scope.workspaceId), eq(deals.leadId, lead.id), eq(deals.stage, current.stage)))
      .returning({ id: deals.id });
    if (!updated) return { changed: false } as const;
    await tx.insert(crmActivities).values({
      workspaceId: scope.workspaceId, leadId: lead.id, actorUserId: scope.userId,
      type: "stage_changed", summary: `Deal moved from ${current.stage} to ${input.stage}.`,
    });
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.deal_stage_changed",
      targetType: "lead", targetId: lead.id, metadata: { from: current.stage, to: input.stage },
    });
    return { changed: true } as const;
  });
}

export async function addCrmContact(scope: WorkspaceScope, input: {
  leadId: string; firstName: string; lastName?: string | undefined; roleTitle?: string | undefined; email?: string | undefined; phone?: string | undefined;
  sourceKind: "user_supplied" | "observed"; sourceLabel: string; sourceUrl?: string | undefined; confidence: "high" | "medium" | "low";
}) {
  const lead = await requireLead(scope, input.leadId);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedEmail && !normalizedPhone) throw new CrmMutationError("Add a valid email address or phone number.");
  return getDatabase().transaction(async (tx) => {
    const [contact] = await tx.insert(contacts).values({
      workspaceId: scope.workspaceId, companyId: lead.companyId, firstName: input.firstName,
      lastName: input.lastName ?? null, roleTitle: input.roleTitle ?? null,
      email: input.email ?? null, normalizedEmail, phone: input.phone ?? null, normalizedPhone,
      sourceKind: input.sourceKind, sourceLabel: input.sourceLabel, sourceUrl: input.sourceUrl ?? null,
      confidence: input.confidence, observedAt: new Date(), createdByUserId: scope.userId,
    }).returning({ id: contacts.id });
    if (!contact) throw new CrmMutationError("The contact could not be created.");
    await tx.insert(crmActivities).values({
      workspaceId: scope.workspaceId, leadId: lead.id, contactId: contact.id, actorUserId: scope.userId,
      type: "contact_added", summary: `Contact ${input.firstName} added from ${input.sourceLabel}.`,
    });
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.contact_added",
      targetType: "contact", targetId: contact.id, metadata: { leadId: lead.id, sourceKind: input.sourceKind },
    });
    return contact;
  });
}

export async function addCrmNote(scope: WorkspaceScope, input: { leadId: string; body: string }) {
  const lead = await requireLead(scope, input.leadId);
  return getDatabase().transaction(async (tx) => {
    const [note] = await tx.insert(crmNotes).values({ workspaceId: scope.workspaceId, leadId: lead.id, authorUserId: scope.userId, body: input.body })
      .returning({ id: crmNotes.id });
    if (!note) throw new CrmMutationError("The note could not be created.");
    await tx.insert(crmActivities).values({ workspaceId: scope.workspaceId, leadId: lead.id, actorUserId: scope.userId, type: "note_added", summary: "A note was added." });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.note_added", targetType: "lead", targetId: lead.id });
    return note;
  });
}

export async function addCrmTask(scope: WorkspaceScope, input: { leadId: string; title: string; description?: string | undefined; dueAt?: Date | undefined; assignedToUserId?: string | undefined }) {
  const lead = await requireLead(scope, input.leadId);
  if (input.assignedToUserId) {
    const [member] = await getDatabase().select({ userId: workspaceMembers.userId }).from(workspaceMembers).where(and(
      eq(workspaceMembers.workspaceId, scope.workspaceId), eq(workspaceMembers.userId, input.assignedToUserId), eq(workspaceMembers.status, "active"),
    )).limit(1);
    if (!member) throw new CrmMutationError("Choose an active member of this workspace.");
  }
  return getDatabase().transaction(async (tx) => {
    const [task] = await tx.insert(crmTasks).values({
      workspaceId: scope.workspaceId, leadId: lead.id, assignedToUserId: input.assignedToUserId ?? null,
      createdByUserId: scope.userId, title: input.title, description: input.description ?? null, dueAt: input.dueAt ?? null,
    }).returning({ id: crmTasks.id });
    if (!task) throw new CrmMutationError("The task could not be created.");
    await tx.insert(crmActivities).values({ workspaceId: scope.workspaceId, leadId: lead.id, actorUserId: scope.userId, type: "task_created", summary: `Task created: ${input.title}` });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.task_created", targetType: "crm_task", targetId: task.id, metadata: { leadId: lead.id } });
    return task;
  });
}

export async function completeCrmTask(scope: WorkspaceScope, taskId: string) {
  const db = getDatabase();
  const [task] = await db.select({ id: crmTasks.id, leadId: crmTasks.leadId, title: crmTasks.title, status: crmTasks.status }).from(crmTasks)
    .where(and(eq(crmTasks.workspaceId, scope.workspaceId), eq(crmTasks.id, taskId))).limit(1);
  if (!task) throw new CrmMutationError("Choose a task in the active workspace.");
  if (task.status !== "open") return { changed: false } as const;
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(crmTasks).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(crmTasks.workspaceId, scope.workspaceId), eq(crmTasks.id, task.id), eq(crmTasks.status, "open")))
      .returning({ id: crmTasks.id });
    if (!updated) return { changed: false } as const;
    await tx.insert(crmActivities).values({ workspaceId: scope.workspaceId, leadId: task.leadId, actorUserId: scope.userId, type: "task_completed", summary: `Task completed: ${task.title}` });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.task_completed", targetType: "crm_task", targetId: task.id });
    return { changed: true } as const;
  });
}

export async function suppressCrmContact(scope: WorkspaceScope, input: { leadId: string; contactId: string; channel: "email" | "phone"; reason: string }) {
  const lead = await requireLead(scope, input.leadId);
  const db = getDatabase();
  const [contact] = await db.select({ id: contacts.id, companyId: contacts.companyId, normalizedEmail: contacts.normalizedEmail, normalizedPhone: contacts.normalizedPhone })
    .from(contacts).where(and(eq(contacts.workspaceId, scope.workspaceId), eq(contacts.id, input.contactId), eq(contacts.companyId, lead.companyId))).limit(1);
  if (!contact) throw new CrmMutationError("Choose a contact for this lead.");
  const normalizedValue = input.channel === "email" ? contact.normalizedEmail : contact.normalizedPhone;
  if (!normalizedValue) throw new CrmMutationError(`This contact has no ${input.channel} value to suppress.`);
  return db.transaction(async (tx) => {
    const [entry] = await tx.insert(suppressionEntries).values({
      workspaceId: scope.workspaceId, contactId: contact.id, channel: input.channel,
      normalizedValue, reason: input.reason, createdByUserId: scope.userId,
    }).onConflictDoNothing({ target: [suppressionEntries.workspaceId, suppressionEntries.channel, suppressionEntries.normalizedValue] })
      .returning({ id: suppressionEntries.id });
    await tx.update(contacts).set({ doNotContact: true, updatedAt: new Date() }).where(and(
      eq(contacts.workspaceId, scope.workspaceId), eq(contacts.id, contact.id),
    ));
    if (entry) {
      await tx.insert(crmActivities).values({ workspaceId: scope.workspaceId, leadId: lead.id, contactId: contact.id, actorUserId: scope.userId, type: "contact_suppressed", summary: `${input.channel} contact suppressed: ${input.reason}` });
      await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "crm.contact_suppressed", targetType: "contact", targetId: contact.id, metadata: { channel: input.channel } });
    }
    return { created: Boolean(entry) } as const;
  });
}
