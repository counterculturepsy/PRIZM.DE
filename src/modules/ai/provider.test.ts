import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DisabledAIProvider } from "./provider";

describe("DisabledAIProvider", () => {
  it("fails closed instead of fabricating output", async () => {
    const provider = new DisabledAIProvider();
    await expect(
      provider.generateStructured(
        { workspaceId: "workspace", requestId: "request", purpose: "test", input: {}, evidence: [] },
        z.object({ answer: z.string() }),
      ),
    ).rejects.toThrow("AI provider is unavailable");
  });
});
