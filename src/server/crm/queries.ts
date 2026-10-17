import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import {
  companies,
  contacts,
  crmActivities,
  crmNotes,
  crmTasks,
  deals,
  leads,
  users,
  workspaceMembers,
} from "@/server/db/schema";
import { tenantWhere } from "@/server/db/tenant";

export function listCrmLeads(scope: WorkspaceScope) {
  return getDatabase().select({
    id: leads.id,
    title: leads.title,
    status: leads.status,
    companyId: companies.id,
    companyName: companies.name,
    industry: companies.industry,
    city: companies.city,
    stage: deals.stage,
    valueMinor: deals.valueMinor,
    currency: deals.currency,
    updatedAt: deals.updatedAt,
  }).from(leads)
    .innerJoin(companies, and(eq(companies.workspaceId, leads.workspaceId), eq(companies.id, leads.companyId)))
    .innerJoin(deals, and(eq(deals.workspaceId, leads.workspaceId), eq(deals.leadId, leads.id)))
    .where(tenantWhere(leads.workspaceId, scope))
    .orderBy(desc(deals.updatedAt), asc(companies.name))
    .limit(200);
}

export function listLeadCandidates(scope: WorkspaceScope) {
  return getDatabase().select({ id: companies.id, name: companies.name, industry: companies.industry, city: companies.city })
    .from(companies)
    .leftJoin(leads, and(eq(leads.workspaceId, companies.workspaceId), eq(leads.companyId, companies.id)))
    .where(and(tenantWhere(companies.workspaceId, scope), isNull(leads.id)))
    .orderBy(asc(companies.name)).limit(200);
}

export async function getCrmLead(scope: WorkspaceScope, leadId: string) {
  const db = getDatabase();
  const [header] = await db.select({
    id: leads.id,
    title: leads.title,
    status: leads.status,
    companyId: companies.id,
    companyName: companies.name,
    industry: companies.industry,
    city: companies.city,
    sourceOpportunityId: leads.sourceOpportunityId,
    stage: deals.stage,
    valueMinor: deals.valueMinor,
    currency: deals.currency,
    expectedCloseAt: deals.expectedCloseAt,
    closedAt: deals.closedAt,
    lostReason: deals.lostReason,
  }).from(leads)
    .innerJoin(companies, and(eq(companies.workspaceId, leads.workspaceId), eq(companies.id, leads.companyId)))
    .innerJoin(deals, and(eq(deals.workspaceId, leads.workspaceId), eq(deals.leadId, leads.id)))
    .where(and(tenantWhere(leads.workspaceId, scope), eq(leads.id, leadId))).limit(1);
  if (!header) return null;

  const [contactRows, noteRows, taskRows, activityRows] = await Promise.all([
    db.select().from(contacts).where(and(tenantWhere(contacts.workspaceId, scope), eq(contacts.companyId, header.companyId))).orderBy(asc(contacts.firstName), asc(contacts.lastName)),
    db.select({ id: crmNotes.id, body: crmNotes.body, createdAt: crmNotes.createdAt, authorName: users.name, authorEmail: users.email })
      .from(crmNotes).innerJoin(users, eq(users.id, crmNotes.authorUserId))
      .where(and(tenantWhere(crmNotes.workspaceId, scope), eq(crmNotes.leadId, header.id))).orderBy(desc(crmNotes.createdAt)).limit(100),
    db.select({ id: crmTasks.id, title: crmTasks.title, description: crmTasks.description, dueAt: crmTasks.dueAt, status: crmTasks.status, completedAt: crmTasks.completedAt })
      .from(crmTasks).where(and(tenantWhere(crmTasks.workspaceId, scope), eq(crmTasks.leadId, header.id))).orderBy(asc(crmTasks.status), asc(crmTasks.dueAt), desc(crmTasks.createdAt)).limit(100),
    db.select({ id: crmActivities.id, type: crmActivities.type, summary: crmActivities.summary, occurredAt: crmActivities.occurredAt, actorName: users.name, actorEmail: users.email })
      .from(crmActivities).innerJoin(users, eq(users.id, crmActivities.actorUserId))
      .where(and(tenantWhere(crmActivities.workspaceId, scope), eq(crmActivities.leadId, header.id))).orderBy(desc(crmActivities.occurredAt)).limit(100),
  ]);
  return { ...header, contacts: contactRows, notes: noteRows, tasks: taskRows, activities: activityRows } as const;
}

export function listCrmContacts(scope: WorkspaceScope) {
  return getDatabase().select({
    id: contacts.id,
    leadId: leads.id,
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    roleTitle: contacts.roleTitle,
    email: contacts.email,
    phone: contacts.phone,
    sourceKind: contacts.sourceKind,
    sourceLabel: contacts.sourceLabel,
    confidence: contacts.confidence,
    doNotContact: contacts.doNotContact,
    companyName: companies.name,
    observedAt: contacts.observedAt,
  }).from(contacts)
    .innerJoin(companies, and(eq(companies.workspaceId, contacts.workspaceId), eq(companies.id, contacts.companyId)))
    .innerJoin(leads, and(eq(leads.workspaceId, contacts.workspaceId), eq(leads.companyId, contacts.companyId)))
    .where(tenantWhere(contacts.workspaceId, scope))
    .orderBy(asc(companies.name), asc(contacts.firstName)).limit(300);
}

export function listCrmTasks(scope: WorkspaceScope) {
  return getDatabase().select({
    id: crmTasks.id,
    leadId: leads.id,
    title: crmTasks.title,
    description: crmTasks.description,
    dueAt: crmTasks.dueAt,
    status: crmTasks.status,
    completedAt: crmTasks.completedAt,
    companyName: companies.name,
  }).from(crmTasks)
    .innerJoin(leads, and(eq(leads.workspaceId, crmTasks.workspaceId), eq(leads.id, crmTasks.leadId)))
    .innerJoin(companies, and(eq(companies.workspaceId, leads.workspaceId), eq(companies.id, leads.companyId)))
    .where(tenantWhere(crmTasks.workspaceId, scope))
    .orderBy(asc(crmTasks.status), asc(crmTasks.dueAt), desc(crmTasks.createdAt)).limit(300);
}

export function listCrmActivities(scope: WorkspaceScope) {
  return getDatabase().select({
    id: crmActivities.id,
    leadId: leads.id,
    type: crmActivities.type,
    summary: crmActivities.summary,
    occurredAt: crmActivities.occurredAt,
    companyName: companies.name,
    actorName: users.name,
    actorEmail: users.email,
  }).from(crmActivities)
    .innerJoin(leads, and(eq(leads.workspaceId, crmActivities.workspaceId), eq(leads.id, crmActivities.leadId)))
    .innerJoin(companies, and(eq(companies.workspaceId, leads.workspaceId), eq(companies.id, leads.companyId)))
    .innerJoin(users, eq(users.id, crmActivities.actorUserId))
    .where(tenantWhere(crmActivities.workspaceId, scope))
    .orderBy(desc(crmActivities.occurredAt)).limit(300);
}

export function listActiveWorkspaceMembers(scope: WorkspaceScope) {
  return getDatabase().select({ userId: users.id, name: users.name, email: users.email })
    .from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(tenantWhere(workspaceMembers.workspaceId, scope), eq(workspaceMembers.status, "active")))
    .orderBy(asc(users.name), asc(users.email));
}
