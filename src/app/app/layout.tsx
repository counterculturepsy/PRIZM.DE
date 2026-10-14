import { cookies } from "next/headers";
import { AppShell } from "@/components/app/app-shell";
import { requireSession } from "@/server/auth/session";
import { ACTIVE_WORKSPACE_COOKIE, listUserWorkspaces } from "@/server/workspaces/context";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const memberships = await listUserWorkspaces(session.user.id);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeId = memberships.some((workspace) => workspace.id === selectedId) ? selectedId : memberships[0]?.id;
  return <AppShell activeId={activeId} memberships={memberships} userName={session.user.name ?? session.user.email ?? "Member"}>{children}</AppShell>;
}
