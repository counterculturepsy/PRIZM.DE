import { z } from "zod";

export const evidenceSchema = z.object({
  source: z.string().min(1),
  observedAt: z.iso.datetime(),
  excerpt: z.string().min(1).max(2_000),
});

export type AIRequest<TInput> = Readonly<{
  workspaceId: string;
  requestId: string;
  purpose: string;
  input: TInput;
  evidence: readonly z.infer<typeof evidenceSchema>[];
}>;

export type AIResult<TOutput> = Readonly<{
  output: TOutput;
  provider: string;
  model: string;
  promptVersion: string;
  durationMs: number;
}>;

export interface AIProvider {
  readonly id: string;
  generateStructured<TInput, TOutput>(
    request: AIRequest<TInput>,
    outputSchema: z.ZodType<TOutput>,
  ): Promise<AIResult<TOutput>>;
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`AI provider is unavailable: ${provider}`);
    this.name = "ProviderUnavailableError";
  }
}

export class DisabledAIProvider implements AIProvider {
  readonly id = "disabled";

  generateStructured<TInput, TOutput>(
    request: AIRequest<TInput>,
    outputSchema: z.ZodType<TOutput>,
  ): Promise<AIResult<TOutput>> {
    void request;
    void outputSchema;
    return Promise.reject(new ProviderUnavailableError(this.id));
  }
}
