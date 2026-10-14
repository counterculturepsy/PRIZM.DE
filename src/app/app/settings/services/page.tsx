import type { Metadata } from "next";
import { ServiceForm } from "@/components/forms/service-form";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { getWorkspaceContext } from "@/server/workspaces/context";
import { listServices } from "@/server/workspaces/queries";

export const metadata: Metadata = { title: "Service settings" };

function price(value: number | null, currency: string) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

export default async function ServiceSettingsPage() {
  const { scope } = await getWorkspaceContext();
  const rows = await listServices(scope);
  const canManage = hasCapability(scope, "manage_workspace");
  return <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]"><div><h2 className="text-xl font-semibold">Services</h2><p className="mt-2 text-sm text-muted-foreground">Your offer catalogue will inform opportunity ranking and proposal drafts.</p><div className="mt-6 grid gap-3">{rows.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">No services yet.</Card> : rows.map((service) => <Card className="p-5" key={service.id}><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{service.name}</h3><p className="mt-1 text-sm text-muted-foreground">{service.description || "No description provided."}</p></div><span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">{service.active ? "Active" : "Inactive"}</span></div><p className="mt-4 font-mono text-xs text-muted-foreground">Starts {price(service.startingPriceMinor, "ZAR")} · Avg {price(service.averagePriceMinor, "ZAR")}</p></Card>)}</div></div><div>{canManage ? <Card className="p-6"><h2 className="mb-5 text-lg font-semibold">Add a service</h2><ServiceForm /></Card> : <Card className="p-6 text-sm text-muted-foreground">Only workspace owners and admins can change services.</Card>}</div></section>;
}
