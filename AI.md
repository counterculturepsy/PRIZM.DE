# AI architecture

AI is an optional, server-only capability behind `AIProvider`. Domain code asks for structured outputs and does not import vendor SDKs. The disabled provider fails closed when no approved adapter is configured.

Every request must include purpose, workspace budget context, redacted input, schema/version, and correlation ID. Every result records provider/model, prompt-template version, latency, token usage where available, and provenance. Provider output is parsed with Zod before use.

AI may analyse evidence and draft recommendations. It may not invent business facts, contacts, technology, revenue, employees, or observed problems. Product surfaces must separate observed fact, inference, recommendation, and confidence. Users review outreach and proposals before any external action.

M6 implements an OpenAI adapter using strict JSON Schema output, a 45-second timeout, bounded responses, no provider-side storage, and secondary Zod validation. Generation requires `AI_GENERATION_ENABLED=true`, an explicit compatible `OPENAI_MODEL`, a server-only key, and an enabled workspace policy. Requests reserve a UTC daily quota before the provider call; failures consume the reservation to bound spend. The prompt receives only a redacted snapshot of up to 12 current audit findings and rejects output that cites an unknown evidence ID.

Generated strategy and outreach remain drafts. Members must inspect evidence and warnings, then approve or reject the saved result with a note. Approval is an audited review state and cannot send a message. Live provider use remains gated by model compatibility, data-processing and lawful-use review, authorized staging evaluation, monitoring, and production governance.

Future adapters may include Anthropic, Google Gemini, and approved local models. Keys remain server-side. Sensitive integration tokens, CRM contacts and notes, unrelated personal data, suppression data, user identifiers, and authentication material are never sent to models.
