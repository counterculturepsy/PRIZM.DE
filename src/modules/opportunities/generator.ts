export const OPPORTUNITY_GENERATION_VERSION = "opportunity-v1";

export const opportunityTypes = [
  "website_improvement",
  "accessibility_remediation",
  "seo_improvement",
  "security_hardening",
  "performance_optimization",
  "mobile_experience",
] as const;

export type OpportunityType = (typeof opportunityTypes)[number];
type Confidence = "high" | "medium" | "low";

export type OpportunityFinding = Readonly<{
  id: string;
  category: string;
  confidence: Confidence;
}>;

export type ServiceOffer = Readonly<{
  id: string;
  slug: string;
  active: boolean;
  startingPriceMinor: number | null;
  averagePriceMinor: number | null;
}>;

export type GeneratedOpportunity = Readonly<{
  type: OpportunityType;
  title: string;
  summary: string;
  businessImpact: string;
  recommendedSolution: string;
  confidence: Confidence;
  sourceFindingIds: string[];
  serviceId: string | null;
  estimatedValueMinMinor: number | null;
  estimatedValueMaxMinor: number | null;
  generationVersion: typeof OPPORTUNITY_GENERATION_VERSION;
}>;

const definitions: Record<OpportunityType, Readonly<{
  title: string;
  businessImpact: string;
  recommendedSolution: string;
  serviceSlugs: readonly string[];
}>> = {
  accessibility_remediation: {
    title: "Accessibility remediation opportunity",
    businessImpact: "Observed accessibility barriers may make important website content or controls harder for some visitors to use.",
    recommendedSolution: "Review the cited elements against WCAG 2.2 AA and remediate confirmed barriers with keyboard and assistive-technology testing.",
    serviceSlugs: ["accessibility", "accessibility-audit", "web-accessibility"],
  },
  seo_improvement: {
    title: "Search and content improvement opportunity",
    businessImpact: "Observed page metadata or content structure may limit how clearly the page is interpreted in search and browser surfaces.",
    recommendedSolution: "Validate search intent, then improve the cited metadata and document structure without making ranking guarantees.",
    serviceSlugs: ["seo", "search-engine-optimisation", "search-engine-optimization"],
  },
  security_hardening: {
    title: "Website security-hardening opportunity",
    businessImpact: "Observed transport or response-header gaps may leave the public website with fewer browser-enforced protections.",
    recommendedSolution: "Confirm the hosting stack and apply the cited transport and response-header controls with regression testing.",
    serviceSlugs: ["web-security", "website-security", "security-hardening"],
  },
  performance_optimization: {
    title: "Website performance opportunity",
    businessImpact: "The bounded observation identified response or document-size signals that may affect visitor experience.",
    recommendedSolution: "Measure the page under controlled lab and field conditions, then optimize confirmed server or document bottlenecks.",
    serviceSlugs: ["web-performance", "performance-optimization", "website-optimization"],
  },
  mobile_experience: {
    title: "Mobile experience opportunity",
    businessImpact: "Observed mobile configuration gaps may produce an unsuitable layout or interaction experience on smaller screens.",
    recommendedSolution: "Validate representative mobile journeys and implement responsive improvements for confirmed issues.",
    serviceSlugs: ["responsive-design", "mobile-web-design", "mobile-experience"],
  },
  website_improvement: {
    title: "Website improvement opportunity",
    businessImpact: "The audit contains supported website findings that warrant a focused technical and content review.",
    recommendedSolution: "Review the cited evidence, confirm the issue in context, and scope only the remediation the business needs.",
    serviceSlugs: ["website-design", "web-design", "website-development", "web-development"],
  },
};

function typeForCategory(category: string): OpportunityType {
  if (category === "accessibility") return "accessibility_remediation";
  if (category === "seo" || category === "content") return "seo_improvement";
  if (category === "security") return "security_hardening";
  if (category === "performance") return "performance_optimization";
  if (category === "mobile") return "mobile_experience";
  return "website_improvement";
}

function lowestConfidence(findings: readonly OpportunityFinding[]): Confidence {
  const rank: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
  return findings.reduce<Confidence>((lowest, finding) => rank[finding.confidence] < rank[lowest] ? finding.confidence : lowest, "high");
}

function cataloguePrice(definition: (typeof definitions)[OpportunityType], services: readonly ServiceOffer[]) {
  const service = services.find((candidate) => candidate.active && definition.serviceSlugs.includes(candidate.slug));
  if (!service) return { serviceId: null, estimatedValueMinMinor: null, estimatedValueMaxMinor: null };
  const minimum = service.startingPriceMinor;
  const maximum = service.averagePriceMinor;
  if (minimum === null && maximum === null) return { serviceId: null, estimatedValueMinMinor: null, estimatedValueMaxMinor: null };
  if ((minimum !== null && minimum < 0) || (maximum !== null && maximum < 0) || (minimum !== null && maximum !== null && maximum < minimum)) {
    return { serviceId: null, estimatedValueMinMinor: null, estimatedValueMaxMinor: null };
  }
  return { serviceId: service.id, estimatedValueMinMinor: minimum, estimatedValueMaxMinor: maximum };
}

export function generateOpportunities(findings: readonly OpportunityFinding[], services: readonly ServiceOffer[]): GeneratedOpportunity[] {
  const grouped = new Map<OpportunityType, OpportunityFinding[]>();
  for (const finding of findings) {
    const type = typeForCategory(finding.category);
    grouped.set(type, [...(grouped.get(type) ?? []), finding]);
  }
  return [...grouped.entries()].map(([type, source]) => {
    const definition = definitions[type];
    return {
      type,
      title: definition.title,
      summary: `${source.length} observed audit ${source.length === 1 ? "finding supports" : "findings support"} this opportunity.`,
      businessImpact: definition.businessImpact,
      recommendedSolution: definition.recommendedSolution,
      confidence: lowestConfidence(source),
      sourceFindingIds: source.map((finding) => finding.id),
      ...cataloguePrice(definition, services),
      generationVersion: OPPORTUNITY_GENERATION_VERSION,
    };
  });
}
