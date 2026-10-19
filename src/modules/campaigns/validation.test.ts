import { describe, expect, it } from "vitest";
import { campaignSchema, preparationIssues, templateSchema } from "./validation";
describe("campaign preparation", () => {
  it("blocks missing audience, sequence gaps, reverse delays, and caps", () => {
    expect(preparationIssues([], [], 10)).toHaveLength(2);
    expect(preparationIssues([{ position: 2, delayDays: 0 }], [{ blockedReasons: [] }], 10)).toContain("Sequence positions must start at 1 and have no gaps.");
    expect(preparationIssues([{ position: 1, delayDays: 5 }, { position: 2, delayDays: 2 }], [{ blockedReasons: [] }], 10)).toContain("Cumulative delays must not decrease between steps.");
    expect(preparationIssues([{ position: 1, delayDays: 0 }], [{ blockedReasons: ["Suppressed"] }, { blockedReasons: [] }], 1)).toHaveLength(2);
    expect(preparationIssues([{ position: 1, delayDays: 0 }, { position: 2, delayDays: 3 }], [{ blockedReasons: [] }], 10)).toEqual([]);
  });
  it("rejects subject header injection, unbounded content and invalid caps", () => {
    expect(templateSchema.safeParse({ name: "Template", subject: "Hi\r\nBcc: leak@example.com", body: "A proposed business message." }).success).toBe(false);
    expect(templateSchema.safeParse({ name: "Template", subject: "Hi", body: "x".repeat(5001) }).success).toBe(false);
    expect(campaignSchema.safeParse({ name: "Campaign", dailyRecipientCap: 101, requestKey: "00000000-0000-4000-8000-000000000001" }).success).toBe(false);
  });
});
