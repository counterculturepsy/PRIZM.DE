import type { Metadata } from "next";
import { InviteForm } from "@/components/forms/invite-form";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { getWorkspaceContext } from "@/server/workspaces/context";
import { listPendingInvitations, listWorkspaceMembers } from "@/server/workspaces/queries";

export const metadata: Metadata = { title: "Team settings" };

export default async function TeamSettingsPage() {
  const { scope } = await getWorkspaceContext();
  const [members, invitations] = await Promise.all([listWorkspaceMembers(scope), listPendingInvitations(scope)]);
  const canInvite = hasCapability(scope, "manage_members");
  return <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]"><div><h2 className="text-xl font-semibold">Team</h2><p className="mt-2 text-sm text-muted-foreground">Membership and roles are enforced server-side on every protected operation.</p><div className="mt-6 grid gap-3">{members.map((member) => <Card className="flex items-center justify-between gap-4 p-5" key={member.userId}><div><p className="font-medium">{member.name ?? member.email}</p><p className="text-sm text-muted-foreground">{member.email}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{member.role}</span></Card>)}</div>{invitations.length > 0 ? <div className="mt-8"><h3 className="font-semibold">Pending invitations</h3><div className="mt-3 grid gap-2">{invitations.map((invite) => <div className="flex justify-between rounded-lg border border-border p-3 text-sm" key={invite.id}><span>{invite.email}</span><span className="capitalize text-muted-foreground">{invite.role}</span></div>)}</div></div> : null}</div><div>{canInvite ? <Card className="p-6"><h2 className="mb-2 text-lg font-semibold">Invite a member</h2><p className="mb-5 text-sm text-muted-foreground">Links expire after seven days and only work for the intended authenticated email.</p><InviteForm /></Card> : <Card className="p-6 text-sm text-muted-foreground">Only workspace owners and admins can invite members.</Card>}</div></section>;
}
