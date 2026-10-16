export const auditCategories = ["seo", "accessibility", "performance", "security", "mobile", "content", "technology"] as const;
export const auditSeverities = ["info", "low", "medium", "high"] as const;
export type AuditCategory = (typeof auditCategories)[number];
export type AuditSeverity = (typeof auditSeverities)[number];

export type AuditFinding = Readonly<{
  category: AuditCategory;
  code: string;
  severity: AuditSeverity;
  title: string;
  summary: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  scoreImpact: number;
}>;

export type AuditSnapshot = Readonly<{
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  headers: Readonly<Record<string, string>>;
  body: Buffer;
  responseBytes: number;
  durationMs: number;
  observedAt: Date;
  robotsAllowed: true;
}>;

export type AuditAnalysis = Readonly<{
  score: number;
  title: string | null;
  findings: readonly AuditFinding[];
}>;

export interface WebsiteAuditProvider {
  readonly id: string;
  inspect(url: URL): Promise<AuditSnapshot>;
}

export class AuditPolicyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AuditPolicyError";
  }
}
