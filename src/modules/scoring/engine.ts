import { classifyPriority, type LeadPriority } from "./classification";

export const LEAD_SCORING_VERSION = "lead-v1";

export type ScoreComponent = Readonly<{
  key: "audit_need" | "evidence_breadth" | "industry_match" | "city_match" | "contact_readiness";
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
  evidenceFindingIds: string[];
}>;

export type ScoreInput = Readonly<{
  findings: readonly Readonly<{ id: string; category: string; scoreImpact: number }>[];
  company: Readonly<{ industry: string | null; city: string | null; email: string | null; phone: string | null }>;
  icp: Readonly<{ industries: readonly string[]; cities: readonly string[] }> | null;
}>;

export type LeadScoreResult = Readonly<{
  totalScore: number;
  priority: LeadPriority;
  components: ScoreComponent[];
  scoringVersion: typeof LEAD_SCORING_VERSION;
}>;

const normalized = (value: string | null | undefined) => value?.trim().toLocaleLowerCase("en-ZA") ?? "";
const matches = (value: string | null, accepted: readonly string[]) => {
  const candidate = normalized(value);
  return Boolean(candidate) && accepted.some((item) => normalized(item) === candidate);
};

export function calculateLeadScore(input: ScoreInput): LeadScoreResult {
  const findingIds = input.findings.map((finding) => finding.id);
  const auditNeed = Math.min(60, input.findings.reduce((total, finding) => total + Math.max(0, finding.scoreImpact), 0));
  const categories = new Set(input.findings.map((finding) => finding.category));
  const breadth = Math.min(10, categories.size * 2);
  const industryMatch = input.icp && matches(input.company.industry, input.icp.industries) ? 15 : 0;
  const cityMatch = input.icp && matches(input.company.city, input.icp.cities) ? 10 : 0;
  const contactReadiness = input.company.email || input.company.phone ? 5 : 0;

  const components: ScoreComponent[] = [
    {
      key: "audit_need", label: "Observed website need", points: auditNeed, maxPoints: 60,
      reason: auditNeed > 0 ? `${input.findings.length} audit findings contribute ${auditNeed} bounded need points.` : "The audit produced no scored findings.",
      evidenceFindingIds: findingIds,
    },
    {
      key: "evidence_breadth", label: "Evidence breadth", points: breadth, maxPoints: 10,
      reason: breadth > 0 ? `Evidence spans ${categories.size} audit categories.` : "No affected audit categories were observed.",
      evidenceFindingIds: findingIds,
    },
    {
      key: "industry_match", label: "Target industry", points: industryMatch, maxPoints: 15,
      reason: industryMatch > 0 ? `${input.company.industry} matches the configured ICP industries.` : "The company industry is absent or does not match the configured ICP.",
      evidenceFindingIds: [],
    },
    {
      key: "city_match", label: "Target city", points: cityMatch, maxPoints: 10,
      reason: cityMatch > 0 ? `${input.company.city} matches the configured ICP cities.` : "The company city is absent or does not match the configured ICP.",
      evidenceFindingIds: [],
    },
    {
      key: "contact_readiness", label: "Supplied public contact", points: contactReadiness, maxPoints: 5,
      reason: contactReadiness > 0 ? "The imported company record contains a public email or phone number." : "No public email or phone number was supplied.",
      evidenceFindingIds: [],
    },
  ];
  const totalScore = Math.max(0, Math.min(100, components.reduce((total, component) => total + component.points, 0)));
  return { totalScore, priority: classifyPriority(totalScore), components, scoringVersion: LEAD_SCORING_VERSION };
}
