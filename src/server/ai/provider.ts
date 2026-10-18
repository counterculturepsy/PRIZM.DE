import { z } from "zod";
import { getServerEnv } from "@/config/env";
import { DisabledAIProvider, type AIProvider, type AIRequest, type AIResult } from "@/modules/ai/provider";
import { PROMPT_VERSION, SALES_SYSTEM_PROMPT } from "@/modules/ai/sales";

export class SalesProviderError extends Error {
  constructor(readonly code: "provider_failed" | "refused" | "incomplete" | "invalid_output" | "response_too_large") {
    super("The AI provider could not produce a valid draft. Review configuration or try a new request later.");
  }
}

const envelopeSchema = z.object({
  choices: z.array(z.object({ finish_reason: z.string(), message: z.object({ content: z.string().nullable().optional(), refusal: z.string().nullable().optional() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative() }).optional(),
});

export class OpenAISalesProvider implements AIProvider {
  readonly id = "openai";
  constructor(private readonly key: string, private readonly model: string, private readonly transport: typeof fetch = fetch) {}

  async generateStructured<TInput, TOutput>(request: AIRequest<TInput>, outputSchema: z.ZodType<TOutput>): Promise<AIResult<TOutput>> {
    const started = Date.now();
    try {
      const response = await this.transport("https://api.openai.com/v1/chat/completions", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(45_000),
        headers: { "Authorization": `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model, store: false, max_completion_tokens: 2000,
          messages: [{ role: "system", content: SALES_SYSTEM_PROMPT }, { role: "user", content: JSON.stringify({ purpose: request.purpose, input: request.input, evidence: request.evidence }) }],
          response_format: { type: "json_schema", json_schema: { name: "prizm_sales_draft", strict: true, schema: z.toJSONSchema(outputSchema) } },
        }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new SalesProviderError("provider_failed"); }
      const reader = response.body?.getReader();
      if (!reader) throw new SalesProviderError("invalid_output");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 100_000) { await reader.cancel(); throw new SalesProviderError("response_too_large"); }
        chunks.push(part.value);
      }
      const envelope = envelopeSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      const choice = envelope.choices[0]!;
      if (choice.message.refusal) throw new SalesProviderError("refused");
      if (choice.finish_reason !== "stop") throw new SalesProviderError("incomplete");
      if (!choice.message.content) throw new SalesProviderError("invalid_output");
      return {
        output: outputSchema.parse(JSON.parse(choice.message.content)), provider: this.id, model: this.model,
        promptVersion: PROMPT_VERSION, durationMs: Date.now() - started,
        inputTokens: envelope.usage?.prompt_tokens, outputTokens: envelope.usage?.completion_tokens,
      };
    } catch (error) {
      if (error instanceof SalesProviderError) throw error;
      throw new SalesProviderError("provider_failed");
    }
  }
}

export function configuredSalesProvider(): { provider: AIProvider; model: string } {
  const env = getServerEnv();
  if (!env.AI_GENERATION_ENABLED || !env.OPENAI_API_KEY || !env.OPENAI_MODEL) return { provider: new DisabledAIProvider(), model: "unconfigured" };
  return { provider: new OpenAISalesProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL), model: env.OPENAI_MODEL };
}
