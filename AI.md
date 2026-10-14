# AI architecture

AI is an optional, server-only capability behind `AIProvider`. Domain code asks for structured outputs and does not import vendor SDKs. The M0 disabled provider fails closed when no approved adapter is configured.

Every request must include purpose, workspace budget context, redacted input, schema/version, and correlation ID. Every result records provider/model, prompt-template version, latency, token usage where available, and provenance. Provider output is parsed with Zod before use.

AI may analyse evidence and draft recommendations. It may not invent business facts, contacts, technology, revenue, employees, or observed problems. Product surfaces must separate observed fact, inference, recommendation, and confidence. Users review outreach and proposals before any external action.

Future adapters: OpenAI, Anthropic, Google Gemini, and approved local models. Keys remain server-side. Sensitive integration tokens, unrelated personal data, suppression data, and authentication material are never sent to models.
