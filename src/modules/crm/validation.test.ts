import { describe, expect, it } from "vitest";
import {
  createContactSchema,
  dealLifecycle,
  normalizeEmail,
  normalizePhone,
  updateDealStageSchema,
} from "./validation";

const leadId = "00000000-0000-4000-8000-000000000001";

describe("CRM validation", () => {
  it("normalizes contact identifiers without inventing data", () => {
    expect(normalizeEmail(" Sales@Example.COM ")).toBe("sales@example.com");
    expect(normalizePhone("+27 (82) 123-4567")).toBe("+27821234567");
    expect(normalizePhone("123")).toBeNull();
  });

  it("requires an attributed contact method", () => {
    const base = { leadId, firstName: "Ari", sourceKind: "user_supplied", sourceLabel: "Client referral", confidence: "medium" };
    expect(createContactSchema.safeParse(base).success).toBe(false);
    expect(createContactSchema.safeParse({ ...base, email: "ari@example.com" }).success).toBe(true);
    expect(createContactSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("requires a loss reason and controls closed timestamps", () => {
    expect(updateDealStageSchema.safeParse({ leadId, stage: "lost" }).success).toBe(false);
    expect(updateDealStageSchema.safeParse({ leadId, stage: "lost", lostReason: "Budget paused" }).success).toBe(true);
    const now = new Date("2026-10-17T12:00:00Z");
    expect(dealLifecycle("won", now).closedAt).toEqual(now);
    expect(dealLifecycle("discovery", now).closedAt).toBeNull();
  });
});
