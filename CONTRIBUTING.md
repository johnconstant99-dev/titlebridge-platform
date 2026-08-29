# Contributing

TitleBridge is in **Phase 1B Private Beta**. Do not start Phase 1C or add live DMV, AAMVA, NMVTIS, ELT, EVR/ERT, payment, or identity-verification integrations without explicit approval.

## Local setup

```bash
npm install
cp .env.example .env.local   # leave DATABASE_URL empty to use in-memory PGLite
npm run dev
```

Auth is on. Create an account from the landing page, complete onboarding, then use the workspace.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Schema

Application schema is `migrations/*.sql` (`0001`–`0007`). Never edit an already-applied file; add a new numbered migration. Preview applies files automatically. Hosted production applies them during `npm run build` (`db:migrate`) against persistent Neon.

## Security rules

- Ordinary queries run as `titlebridge_app` inside `withRlsContext`. `getSql()` must fail closed outside that context.
- Privileged SQL is `getServiceSql()` only (bootstrap, Better Auth, first-login, trusted audit).
- Customers cannot INSERT audit rows. Use `writeAudit`.
- Scope every customer query by the authenticated `userId`. Do not trust client-sent ids.
- Do not weaken RLS to make tests pass.

## Legal copy

Keep independent-platform disclaimers. “Submit” means **Submit for TitleBridge internal review**, not a motor-vehicle department filing.
