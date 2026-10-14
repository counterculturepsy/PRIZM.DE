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
| provider API keys | When enabled | Server | Optional AI adapters |

Run `pnpm env:check` before starting a deployment. Empty optional values normalize to absent. A half-configured OAuth pair is rejected. No secret uses a `NEXT_PUBLIC_` prefix.

Development, preview, and production use separate databases, OAuth clients, encryption keys, and provider projects. Rotate secrets through the deployment platform; do not paste them into issues, logs, screenshots, or source files.
