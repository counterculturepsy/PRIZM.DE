// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { salesDraftSchema } from "@/modules/ai/sales";
import { OpenAISalesProvider } from "./provider";
const request = { workspaceId: "tenant-private", requestId: "request-private", purpose: "strategy", input: {}, evidence: [] };
describe("OpenAI sales adapter", () => {
  it("uses strict structured output and excludes workspace identifiers", async () => {
    const output = { title: "Review", sections: [{ heading: "Next step", text: "Validate the finding", evidenceIds: ["00000000-0000-4000-8000-000000000001"] }], reviewWarnings: ["Human review required"] };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } })));
    const provider = new OpenAISalesProvider("test-only-key", "configured-model", transport);
    await expect(provider.generateStructured(request, salesDraftSchema)).resolves.toMatchObject({ output, inputTokens: 100, outputTokens: 50 });
    const sent = String(transport.mock.calls[0]?.[1]?.body);
    expect(sent).toContain('"strict":true'); expect(sent).not.toContain("tenant-private"); expect(sent).not.toContain("request-private");
  });
  it.each([
    [{ choices: [{ finish_reason: "stop", message: { refusal: "Cannot help" } }] }, "refused"],
    [{ choices: [{ finish_reason: "length", message: { content: "{}" } }] }, "incomplete"],
    [{ choices: [{ finish_reason: "stop", message: { content: "<invalid>" } }] }, "provider_failed"],
  ])("rejects unsafe provider completion", async (body, code) => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body)));
    await expect(new OpenAISalesProvider("test-only-key", "configured-model", transport).generateStructured(request, salesDraftSchema)).rejects.toMatchObject({ code });
  });
  it("sanitizes upstream errors and rejects oversized bodies", async () => {
    const failed = vi.fn<typeof fetch>().mockResolvedValue(new Response("private upstream secret", { status: 500 }));
    await expect(new OpenAISalesProvider("test-only-key", "model", failed).generateStructured(request, salesDraftSchema)).rejects.toMatchObject({ code: "provider_failed" });
    const large = vi.fn<typeof fetch>().mockResolvedValue(new Response("x".repeat(100001)));
    await expect(new OpenAISalesProvider("test-only-key", "model", large).generateStructured(request, salesDraftSchema)).rejects.toMatchObject({ code: "response_too_large" });
  });
});
