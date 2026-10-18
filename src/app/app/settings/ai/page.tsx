import { AiPolicyForm } from "@/components/forms/ai-forms";
import { Card } from "@/components/ui/card";
import { getAiPolicy } from "@/server/ai/service";
import { configuredSalesProvider } from "@/server/ai/provider";
import { getWorkspaceContext } from "@/server/workspaces/context";
export const metadata = { title: "AI policy" };
export default async function AiSettingsPage() {
  const { scope } = await getWorkspaceContext("manage_workspace");
  const policy = await getAiPolicy(scope);
  const configured = configuredSalesProvider();
  return <Card className="max-w-2xl p-6"><h1 className="text-2xl font-semibold">AI drafting policy</h1><p className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">Provider: {configured.provider.id === "disabled" ? "Not configured" : `${configured.provider.id} · ${configured.model}`}. Drafts require human review before external use.</p><AiPolicyForm dailyRequestLimit={policy.dailyRequestLimit} enabled={policy.enabled} /></Card>;
}
