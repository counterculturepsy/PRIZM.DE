import { and, desc, eq, sql } from "drizzle-orm";
import { hasCapability, type WorkspaceScope } from "@/modules/workspaces/scope";
import { calculateProposal, proposalApprovalSchema, proposalDraftSchema, proposalRevisionSchema } from "@/modules/proposals/validation";
import { getDatabase } from "@/server/db";
import { auditLogs, companies, leads, proposals, proposalVersions, workspaceMembers, workspaces } from "@/server/db/schema";

export class ProposalError extends Error {}

async function authorize(scope: WorkspaceScope, capability: "write" | "manage_workspace") {
  if (!hasCapability(scope, capability)) throw new ProposalError("Your role cannot perform this proposal action.");
  const [member] = await getDatabase().select({ role: workspaceMembers.role }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, scope.workspaceId), eq(workspaceMembers.userId, scope.userId), eq(workspaceMembers.status, "active"), eq(workspaces.status, "active"))).limit(1);
  if (!member || member.role !== scope.role) throw new ProposalError("Workspace membership changed. Refresh and try again.");
}

export async function createProposal(scope: WorkspaceScope, input: unknown) {
  await authorize(scope, "write");
  const parsed = proposalDraftSchema.parse(input);
  const db = getDatabase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from workspaces where id = ${scope.workspaceId} for update`);
    const [existing] = await tx.select({ id: proposals.id, leadId: proposals.leadId }).from(proposals)
      .where(and(eq(proposals.workspaceId, scope.workspaceId), eq(proposals.requestKey, parsed.requestKey))).limit(1);
    if (existing) {
      if (existing.leadId !== parsed.leadId) throw new ProposalError("This request key was already used for another lead.");
      return existing.id;
    }
    const [target] = await tx.select({ leadId: leads.id, currency: workspaces.currency }).from(leads)
      .innerJoin(workspaces, eq(workspaces.id, leads.workspaceId))
      .where(and(eq(leads.workspaceId, scope.workspaceId), eq(leads.id, parsed.leadId))).limit(1);
    if (!target) throw new ProposalError("Choose a lead in the active workspace.");
    const snapshot = calculateProposal(parsed, target.currency);
    const [proposal] = await tx.insert(proposals).values({ workspaceId: scope.workspaceId, leadId: parsed.leadId, requestKey: parsed.requestKey, title: snapshot.title, createdByUserId: scope.userId }).returning({ id: proposals.id });
    if (!proposal) throw new ProposalError("The proposal could not be created.");
    await tx.insert(proposalVersions).values({ workspaceId: scope.workspaceId, proposalId: proposal.id, version: 1, snapshot, createdByUserId: scope.userId });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "proposal.created", targetType: "proposal", targetId: proposal.id, metadata: { leadId: parsed.leadId, version: 1 } });
    return proposal.id;
  });
}

export async function reviseProposal(scope: WorkspaceScope, proposalId: string, input: unknown) {
  await authorize(scope, "write");
  const parsed = proposalRevisionSchema.parse(input);
  return getDatabase().transaction(async (tx) => {
    await tx.execute(sql`select id from proposals where workspace_id = ${scope.workspaceId} and id = ${proposalId} for update`);
    const [current] = await tx.select({ version: proposals.currentVersion, currency: workspaces.currency }).from(proposals)
      .innerJoin(workspaces, eq(workspaces.id, proposals.workspaceId))
      .where(and(eq(proposals.workspaceId, scope.workspaceId), eq(proposals.id, proposalId))).limit(1);
    if (!current) throw new ProposalError("Choose a proposal in the active workspace.");
    const nextVersion = current.version + 1;
    const snapshot = calculateProposal(parsed, current.currency);
    await tx.insert(proposalVersions).values({ workspaceId: scope.workspaceId, proposalId, version: nextVersion, snapshot, createdByUserId: scope.userId });
    await tx.update(proposals).set({ title: snapshot.title, currentVersion: nextVersion, status: "draft", approvedByUserId: null, approvalNote: null, approvedAt: null, updatedAt: new Date() })
      .where(and(eq(proposals.workspaceId, scope.workspaceId), eq(proposals.id, proposalId), eq(proposals.currentVersion, current.version)));
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "proposal.revised", targetType: "proposal", targetId: proposalId, metadata: { version: nextVersion } });
    return nextVersion;
  });
}

export async function approveProposal(scope: WorkspaceScope, input: unknown) {
  await authorize(scope, "manage_workspace");
  const parsed = proposalApprovalSchema.parse(input);
  return getDatabase().transaction(async (tx) => {
    const [updated] = await tx.update(proposals).set({ status: "approved", approvedByUserId: scope.userId, approvalNote: parsed.note, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(proposals.workspaceId, scope.workspaceId), eq(proposals.id, parsed.proposalId), eq(proposals.status, "draft"))).returning({ id: proposals.id, version: proposals.currentVersion });
    if (!updated) throw new ProposalError("This proposal is unavailable or is not a draft.");
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "proposal.approved", targetType: "proposal", targetId: updated.id, metadata: { version: updated.version } });
  });
}

export function listProposals(scope: WorkspaceScope) {
  return getDatabase().select({ id: proposals.id, title: proposals.title, status: proposals.status, currentVersion: proposals.currentVersion, updatedAt: proposals.updatedAt, companyName: companies.name })
    .from(proposals).innerJoin(leads, and(eq(leads.workspaceId, proposals.workspaceId), eq(leads.id, proposals.leadId)))
    .innerJoin(companies, and(eq(companies.workspaceId, leads.workspaceId), eq(companies.id, leads.companyId)))
    .where(eq(proposals.workspaceId, scope.workspaceId)).orderBy(desc(proposals.updatedAt)).limit(100);
}

export async function getProposal(scope: WorkspaceScope, proposalId: string) {
  const [proposal] = await getDatabase().select().from(proposals).where(and(eq(proposals.workspaceId, scope.workspaceId), eq(proposals.id, proposalId))).limit(1);
  if (!proposal) return null;
  const versions = await getDatabase().select().from(proposalVersions).where(and(eq(proposalVersions.workspaceId, scope.workspaceId), eq(proposalVersions.proposalId, proposalId))).orderBy(desc(proposalVersions.version));
  return { ...proposal, versions, current: versions.find((row) => row.version === proposal.currentVersion)! };
}
