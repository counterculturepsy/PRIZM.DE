import { describe, expect, it } from "vitest";
import { inviteMemberSchema, onboardingSchema, toSlug } from "./validation";

describe("workspace validation", () => {
  it("creates stable URL-safe slugs", () => {
    expect(toSlug("  Cape & Code Studio  ")).toBe("cape-code-studio");
  });

  it("does not allow another owner to be invited", () => {
    expect(inviteMemberSchema.safeParse({ email: "owner@example.com", role: "owner" }).success).toBe(false);
  });

  it("rejects inverted budgets", () => {
    const result = onboardingSchema.safeParse({
      services: "Web design",
      cities: "Cape Town",
      industries: "Hospitality",
      minimumBudget: 50_000,
      maximumBudget: 10_000,
    });
    expect(result.success).toBe(false);
  });
});
