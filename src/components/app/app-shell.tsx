import Link from "next/link";
import { BarChart3, Bot, Building2, FileText, KanbanSquare, LayoutDashboard, Lightbulb, ListChecks, MessageSquareText, ScanSearch, Search, Settings, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { selectWorkspaceAction } from "@/app/app/actions";
import type { WorkspaceSummary } from "@/server/workspaces/context";

const activeLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/discover/search", label: "Discover", icon: Search },
  { href: "/app/discover/opportunities", label: "Opportunities", icon: Lightbulb },
  { href: "/app/companies", label: "Companies", icon: Building2 },
  { href: "/app/audits", label: "Audits", icon: ScanSearch },
  { href: "/app/leads", label: "CRM leads", icon: Users },
  { href: "/app/crm/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/app/crm/tasks", label: "Tasks", icon: ListChecks },
  { href: "/app/ai/strategy", label: "AI strategy", icon: Bot },
  { href: "/app/ai/outreach", label: "Outreach drafts", icon: MessageSquareText },
  { href: "/app/proposals", label: "Proposals", icon: FileText },
  { href: "/app/campaigns", label: "Campaign preparation", icon: MessageSquareText },
  { href: "/app/reports/sales", label: "Reports", icon: BarChart3 },
  { href: "/app/settings/profile", label: "Settings", icon: Settings },
] as const;

function Navigation() {
  return (
    <nav aria-label="Application" className="grid gap-1">
      {activeLinks.map(({ href, label, icon: Icon }) => (
        <Link className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href} key={href}>
          <Icon aria-hidden="true" className="size-4" />{label}
        </Link>
      ))}
    </nav>
  );
}

function WorkspaceSelect({ memberships, activeId }: { memberships: readonly WorkspaceSummary[]; activeId: string | undefined }) {
  if (memberships.length === 0) return <span className="text-xs text-muted-foreground">No workspace yet</span>;
  return (
    <form action={selectWorkspaceAction}>
      <label className="sr-only" htmlFor="workspace-switcher">Active workspace</label>
      <div className="flex items-center gap-2"><select className="min-h-10 max-w-52 rounded-lg border border-border bg-surface-elevated px-3 text-sm outline-none focus:ring-2 focus:ring-ring" defaultValue={activeId} id="workspace-switcher" name="workspaceId">
        {memberships.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select><button className="min-h-10 rounded-lg border border-border px-3 text-xs font-medium hover:border-primary" type="submit">Switch</button></div>
    </form>
  );
}

export function AppShell({ children, memberships, activeId, userName }: { children: React.ReactNode; memberships: readonly WorkspaceSummary[]; activeId: string | undefined; userName: string }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-border bg-card/50 p-5 lg:block">
        <Logo />
        <div className="mt-8"><Navigation /></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="lg:hidden"><Logo className="text-sm" /></div>
          <div className="hidden lg:block"><WorkspaceSelect activeId={activeId} memberships={memberships} /></div>
          <div className="flex items-center gap-3 text-right"><div><p className="text-sm font-medium">{userName}</p><p className="text-xs text-muted-foreground">M9 analytics</p></div><Link className="text-xs text-muted-foreground hover:text-foreground" href="/api/auth/signout">Sign out</Link></div>
        </header>
        <details className="border-b border-border p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">Navigation and workspace</summary>
          <div className="mt-4 grid gap-4"><WorkspaceSelect activeId={activeId} memberships={memberships} /><Navigation /></div>
        </details>
        {children}
      </div>
    </div>
  );
}
