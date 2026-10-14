import Link from "next/link";

const links = [
  ["/app/settings/profile", "Profile"],
  ["/app/settings/services", "Services"],
  ["/app/settings/icp", "Ideal customer"],
  ["/app/settings/team", "Team"],
] as const;

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8"><div className="mb-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Workspace settings</p><h1 className="mt-3 text-3xl font-semibold">Configure the foundation</h1></div><nav aria-label="Settings" className="mb-8 flex gap-2 overflow-x-auto border-b border-border pb-3">{links.map(([href, label]) => <Link className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href} key={href}>{label}</Link>)}</nav>{children}</main>;
}
