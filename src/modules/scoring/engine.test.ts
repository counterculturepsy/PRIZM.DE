import { describe, expect, it } from "vitest";
import { calculateLeadScore } from "./engine";

describe("calculateLeadScore", () => {
  it("explains and caps every scoring component", () => {
    const result = calculateLeadScore({
      findings: [
        { id: "finding-1", category: "security", scoreImpact: 50 },
        { id: "finding-2", category: "accessibility", scoreImpact: 40 },
      ],
      company: { industry: "Hospitality", city: "Johannesburg", email: "hello@example.com", phone: null },
      icp: { industries: ["hospitality"], cities: ["Johannesburg"] },
    });
    expect(result).toMatchObject({ totalScore: 94, priority: "priority", scoringVersion: "lead-v1" });
    expect(result.components.map((component) => component.points)).toEqual([60, 4, 15, 10, 5]);
    expect(result.components.reduce((total, component) => total + component.points, 0)).toBe(result.totalScore);
  });

  it("does not award matches or contact points without evidence", () => {
    const result = calculateLeadScore({
      findings: [],
      company: { industry: null, city: "Cape Town", email: null, phone: null },
      icp: { industries: ["Retail"], cities: ["Durban"] },
    });
    expect(result.totalScore).toBe(0);
    expect(result.priority).toBe("low");
    expect(result.components).toHaveLength(5);
  });
});
