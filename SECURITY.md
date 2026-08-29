# Security

TitleBridge is a **Phase 1B Private Beta** independent technology platform. It is not a government agency, DMV, AAMVA, NMVTIS, or state-authorized motor-vehicle service.

Full model: [docs/security.md](docs/security.md).

## Reporting

Report vulnerabilities privately to the repository owner. Do not open a public issue that includes:

- customer PII
- full VINs
- document contents
- session tokens, signed URLs, or credentials

## Secrets

Never commit `.env`, `.env.local`, database URLs, Better Auth secrets, or broker client secrets. Use [`.env.example`](.env.example) as the template.

The preview OAuth client in `src/lib/auth/preview.ts` is a **low-privilege live-preview broker client** (`*.grok-sandbox.com` only). Hosted production uses injected `GROK_AUTH_*` credentials instead. Do not reuse the preview client in production.

## Production fail-closed

Hosted production (`VERCEL`) will not start without `DATABASE_URL` and `BETTER_AUTH_SECRET`. Development seed data never loads when `NODE_ENV=production`, `VERCEL`, or `DATABASE_URL` is set.
