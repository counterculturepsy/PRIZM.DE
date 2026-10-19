import { describe, expect, it } from "vitest";
import { canViewRevenueReport, formatCycleDays, formatMetricPercent, formatMinorAmount, ratioPercent } from "./metrics";

describe("analytics metric helpers", () => {
  it("calculates reproducible ratios without manufacturing zero-data conversion", () => {
    expect(ratioPercent(1, 3)).toBe(33.3);
    expect(ratioPercent(0, 5)).toBe(0);
    expect(ratioPercent(0, 0)).toBeNull();
    expect(formatMetricPercent(null)).toBe("Not available");
  });

  it("keeps money and cycle labels explicit", () => {
    expect(formatMinorAmount(125050, "ZAR")).toContain("1\u00a0250,50");
    expect(formatCycleDays(4.25)).toBe("4.3 days");
    expect(formatCycleDays(null)).toBe("Not available");
  });

  it("restricts revenue reports to privileged roles", () => {
    expect(canViewRevenueReport("owner")).toBe(true);
    expect(canViewRevenueReport("admin")).toBe(true);
    expect(canViewRevenueReport("sales")).toBe(false);
    expect(canViewRevenueReport("developer")).toBe(false);
    expect(canViewRevenueReport("viewer")).toBe(false);
  });
});
