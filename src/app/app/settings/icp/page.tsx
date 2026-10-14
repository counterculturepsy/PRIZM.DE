import type { Metadata } from "next";
import { IcpForm } from "@/components/forms/icp-form";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { getWorkspaceContext } from "@/server/workspaces/context";
import { getIdealCustomerProfile } from "@/server/workspaces/queries";

export const metadata: Metadata = { title: "ICP settings" };

export default async function IcpSettingsPage() {
  const { scope } = await getWorkspaceContext();
  const profile = await getIdealCustomerProfile(scope);
  const canManage = hasCapability(scope, "manage_workspace");
  return <section><h2 className="text-xl font-semibold">Ideal customer profile</h2><p className="mt-2 text-sm text-muted-foreground">Control who should rank highly. These settings never trigger outreach.</p><Card className="mt-6 p-6">{canManage ? <IcpForm cities={profile?.cities ?? []} industries={profile?.industries ?? []} maximumBudget={(profile?.maximumBudgetMinor ?? 0) / 100} minimumBudget={(profile?.minimumBudgetMinor ?? 0) / 100} /> : <p className="text-sm text-muted-foreground">Only workspace owners and admins can change the ICP.</p>}</Card></section>;
}
