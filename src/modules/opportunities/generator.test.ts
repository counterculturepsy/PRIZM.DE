import { describe, expect, it } from "vitest";
import { generateOpportunities } from "./generator";

describe("generateOpportunities", () => {
  it("groups findings, preserves weakest confidence, and links evidence", () => {
    const result = generateOpportunities([
      { id: "a", category: "seo", confidence: "high" },
      { id: "b", category: "content", confidence: "medium" },
      { id: "c", category: "security", confidence: "high" },
    ], []);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: "seo_improvement", confidence: "medium", sourceFindingIds: ["a", "b"] });
    expect(result[1]).toMatchObject({ type: "security_hardening", sourceFindingIds: ["c"] });
  });

  it("copies price guidance only from a matching active, valid service", () => {
    const findings = [{ id: "a", category: "accessibility", confidence: "high" }] as const;
    const priced = generateOpportunities(findings, [
      { id: "inactive", slug: "accessibility", active: false, startingPriceMinor: 10_000, averagePriceMinor: 20_000 },
      { id: "active", slug: "accessibility-audit", active: true, startingPriceMinor: 15_000, averagePriceMinor: 25_000 },
    ])[0];
    expect(priced).toMatchObject({ serviceId: "active", estimatedValueMinMinor: 15_000, estimatedValueMaxMinor: 25_000 });
    expect(generateOpportunities(findings, [
      { id: "invalid", slug: "accessibility", active: true, startingPriceMinor: 30_000, averagePriceMinor: 20_000 },
    ])[0]).toMatchObject({ serviceId: null, estimatedValueMinMinor: null, estimatedValueMaxMinor: null });
  });
});
