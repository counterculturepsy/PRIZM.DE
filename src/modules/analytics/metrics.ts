import type { WorkspaceRole } from "@/modules/workspaces/scope";

export const analyticsVersion = "analytics-v1" as const;

export const dealStageLabels = {
  identified: "Identified",
  contacted: "Contacted",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
} as const;

export type AnalyticsDealStage = keyof typeof dealStageLabels;

export function canViewRevenueReport(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function ratioPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function formatMetricPercent(value: number | null): string {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}

export function formatMinorAmount(valueMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(valueMinor / 100);
  } catch {
    return `${currency} ${(valueMinor / 100).toFixed(2)}`;
  }
}

export function formatCycleDays(value: number | null): string {
  return value === null ? "Not available" : `${value.toFixed(1)} days`;
}

export function formatAnalyticsTime(value: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(value);
  } catch {
    return value.toISOString();
  }
}
