import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth/session";
import { ACTIVE_WORKSPACE_COOKIE } from "@/server/workspaces/context";
import { acceptWorkspaceInvitation } from "@/server/workspaces/mutations";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { token } = await params;
  const { error } = await searchParams;

  async function acceptAction() {
    "use server";
    const currentSession = await requireSession();
    if (!currentSession.user.email) redirect(`/invite/${token}?error=missing-email`);
    const workspaceId = await acceptWorkspaceInvitation({ token, userId: currentSession.user.id, email: currentSession.user.email });
    if (!workspaceId) redirect(`/invite/${token}?error=invalid`);
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    redirect("/app");
  }

  return <main className="page-grid grid min-h-screen place-items-center px-5 py-12"><Card className="w-full max-w-lg p-7 sm:p-9"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Workspace invitation</p><h1 className="mt-3 text-3xl font-semibold">Join a PRIZM workspace</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">You are signed in as {session.user.email}. The invitation will only be accepted if it was issued to this exact address and has not expired.</p>{error ? <p className="mt-5 text-sm text-error" role="alert">This invitation is invalid, expired, already used, or belongs to another email address.</p> : null}<form action={acceptAction} className="mt-7"><Button type="submit">Accept invitation</Button></form></Card></main>;
}
