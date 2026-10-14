import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, MapPin, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getWorkspaceContext } from "@/server/workspaces/context";
import { getIdealCustomerProfile, listServices, listWorkspaceMembers } from "@/server/workspaces/queries";
import { countCompanies } from "@/server/prospecting/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { workspace, scope } = await getWorkspaceContext();
  if (!workspace.onboardingCompleted) {
    return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8"><Card className="p-7 sm:p-10"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Setup required</p><h1 className="mt-3 text-3xl font-semibold">Shape your first opportunity search.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Tell PRIZM.DEV what you sell, where you work, and which businesses fit. This creates workspace-owned services and your first ICP.</p><Link className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground" href="/app/onboarding">Continue onboarding <ArrowRight className="ml-2 size-4" /></Link></Card></main>;
  }

  const [serviceRows, profile, members, companyCount] = await Promise.all([listServices(scope), getIdealCustomerProfile(scope), listWorkspaceMembers(scope), countCompanies(scope)]);
  const cards = [
    { label: "Active services", value: serviceRows.filter((service) => service.active).length, icon: BriefcaseBusiness },
    { label: "Target cities", value: profile?.cities.length ?? 0, icon: MapPin },
    { label: "Target industries", value: profile?.industries.length ?? 0, icon: Target },
    { label: "Team members", value: members.filter((member) => member.status === "active").length, icon: Users },
    { label: "Companies", value: companyCount, icon: Building2 },
  ];

  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Workspace overview</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{workspace.name}</h1><p className="mt-3 text-muted-foreground">Your services, target profile, team, and tenant-owned prospect database in one place.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, icon: Icon }) => <Card className="p-5" key={label}><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div><p className="mt-5 font-mono text-3xl font-semibold">{value}</p></Card>)}</div><Card className="mt-6 p-6"><h2 className="text-lg font-semibold">Prospect intelligence</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Import an approved company dataset, search it by South African location and industry, and retain clear source provenance without uncontrolled scraping.</p><Link className="mt-5 inline-flex items-center text-sm font-semibold text-primary hover:underline" href="/app/discover/search">Open discovery <ArrowRight className="ml-2 size-4" /></Link></Card></main>;
}
