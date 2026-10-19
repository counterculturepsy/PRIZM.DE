import { describe, expect, it } from "vitest";
import { disabledCampaignProvider } from "./delivery";
import { hashUnsubscribeToken, unsubscribeTokenForMessage } from "@/server/campaigns/delivery";

describe("campaign delivery primitives", () => {
  it("derives stable non-plaintext unsubscribe tokens", () => {
    const token = unsubscribeTokenForMessage("00000000-0000-4000-8000-000000000001", "a-secret-value-that-is-at-least-thirty-two-bytes");
    expect(token).toContain("00000000-0000-4000-8000-000000000001.");
    expect(hashUnsubscribeToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashUnsubscribeToken(token)).not.toContain(token);
  });

  it("ships with a provider that cannot send", async () => {
    await expect(disabledCampaignProvider.send({ to: "test@example.com", subject: "Subject", body: "A sufficiently long body.", unsubscribeUrl: "https://example.com/u", idempotencyKey: "key" }))
      .rejects.toMatchObject({ code: "delivery_disabled", retryable: false });
  });
});
