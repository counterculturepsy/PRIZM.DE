# Environment

Copy `.env.example` to `.env.local`. Never commit real values.

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXTAUTH_URL` | Yes | Server | Canonical application origin used by Auth.js |
| `DATABASE_URL` | Yes | Server | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Server | At least 32 characters; session signing |
| `AUTH_GITHUB_ID/SECRET` | Pair | Server | GitHub OAuth |
| `AUTH_GOOGLE_ID/SECRET` | Pair | Server | Google OAuth |
| `INTEGRATION_ENCRYPTION_KEY` | Production integrations | Server | 32-byte base64 envelope key |
| `AI_GENERATION_ENABLED` | No | Server | Fail-closed AI provider switch; defaults to `false` |
| `OPENAI_API_KEY` | When AI enabled | Server | OpenAI credential; never exposed to browsers |
| `OPENAI_MODEL` | When AI enabled | Server | Explicit compatible model identifier; no implicit production default |
| other provider API keys | Future adapters | Server | Reserved optional AI adapters |
| `WEBSITE_AUDIT_ENABLED` | No | Server/worker | Fail-closed switch; defaults to `false` |
| `AUDIT_USER_AGENT` | When audits enabled | Worker | Identifiable crawler product token and public contact/policy URL |
| `AUDIT_MAX_RESPONSE_BYTES` | When audits enabled | Worker | HTML response limit from 100,000 to 2,000,000 bytes |
| `CAMPAIGN_DELIVERY_ENABLED` | No | Server/worker | Fail-closed switch; only `false` is accepted until an approved adapter exists |

Run `pnpm env:check` before starting a deployment. Empty optional values normalize to absent. A half-configured OAuth pair is rejected. No secret uses a `NEXT_PUBLIC_` prefix.

Development, preview, and production use separate databases, OAuth clients, encryption keys, and provider projects. Rotate secrets through the deployment platform; do not paste them into issues, logs, screenshots, or source files.

Website auditing remains disabled for ordinary local UI work. Before enabling it, approve outbound network policy, publish the crawler identity/contact, configure worker scheduling and rate limits, and monitor blocked, failed, and retried jobs.

AI generation also remains disabled for ordinary local work. Enabling it requires all three server values above, an Owner/Admin-enabled workspace policy, an approved compatible model, data-processing and lawful-use review, authorized staging evaluation, request monitoring, and production governance. Local validation uses mocked transport and must not add a real key merely to make tests pass.

Campaign delivery cannot be enabled in this release. Tests inject an in-memory provider and a test-only unsubscribe secret directly into the server service. Future production configuration must add a dedicated rotated unsubscribe secret, encrypted provider credentials, verified sender identity and provider-specific webhook secret only alongside the reviewed adapter that consumes them.
