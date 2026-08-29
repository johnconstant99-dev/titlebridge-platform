# TitleBridge

Independent technology platform for digital vehicle ownership, electronic titling, registration, and identity-verification **workflows**.

TitleBridge is **not** a government agency, DMV, AAMVA, NMVTIS, or state-authorized motor-vehicle service. Availability of electronic title, registration, lien, and vehicle-record services depends on jurisdiction, authorization, and participating providers.

## Current status

**Phase 1B Private Beta** — vehicles, documents, and internal title-case review.

This phase implements authentication, accounts, onboarding, role-based access, vehicles with VIN format validation, ownership records, private document upload, title cases, lien statements, internal review, audit logging, and integration adapters.

Phase 1B Private Beta contains **no live government vehicle-record integrations**. VIN, title, registration, ELT, EVR, and NMVTIS adapters return `Provider not configured` rather than fabricated data.

**Submit** means: send the record to TitleBridge internal review only. It does not file with a motor-vehicle department.

Do not start Phase 1C until this private beta is approved.

## Architecture

- React 19 + TypeScript + TanStack Start / Router / Query
- Tailwind v4
- Better Auth (email/password plus Google and X via the platform broker)
- PostgreSQL (Neon when deployed; embedded PGLite **only** in local/preview)
- Server functions and `/api/*` routes with server-side authorization
- Private document vault (Postgres BYTEA + short-lived signed URLs)
- Modular integration adapters under `src/integrations/`

See [docs/architecture.md](docs/architecture.md), [docs/database.md](docs/database.md), and [docs/security.md](docs/security.md).

## Authentication

- Email/password sign-up and sign-in
- Google and X via the auth broker
- Sign-out, session cookies (deployed) / preview bearer (iframe)
- Protected customer (`/app`) and internal (`/internal`) routes
- Server-side `authMiddleware` on every per-user function
- Onboarding completion is stored on `profiles.onboarding_completed` and survives refresh/relogin

Password reset UI exists. **Outbound email delivery is not configured** in this private beta, so no reset message is sent.

Future (not implemented): passkeys, MFA, enterprise SSO.

## Customer workflow

1. Create an account
2. Complete onboarding (name, state, consent)
3. Add a vehicle (ISO 3779 VIN format check — displayed as “VIN format validated”, never “vehicle verified”)
4. Enter ownership and lien statements (self-reported; liens are never auto-verified)
5. Upload a private document (PDF / JPEG / PNG / WebP, 5 MB)
6. Create a title case, review, **Submit for TitleBridge internal review**
7. See status `Submitted for internal review` / `Under review`

Customer data is scoped to the signed-in account. Knowing another customer’s record id is not authorization.

## Staff workflow

Authorized staff (`OPERATIONS`, `COMPLIANCE`, `ADMIN`, `SUPER_ADMIN`) use `/internal`:

1. Open Internal review
2. Find a submitted title case
3. Assign / reassign (OPERATIONS, ADMIN, SUPER_ADMIN)
4. Inspect vehicle, ownership, lien, and private documents
5. Request more information, flag for compliance, or approve a section
6. Update permitted case status (operations cannot mark a case `completed`)

Customers cannot access the internal console, assign cases, write internal reviews, promote roles, or mark liens `verified`.

## Roles

| Role | Notes |
| --- | --- |
| CUSTOMER | Own records only |
| OPERATIONS | Review, inspect, assign; cannot promote roles or flag compliance |
| COMPLIANCE | Review, audit, flags; cannot assign |
| ADMIN | Users, orgs, settings; **cannot** grant `SUPER_ADMIN` |
| SUPER_ADMIN | Reserved; development bootstrap only when no super admin exists |

## Database and RLS

Schema is `migrations/*.sql` (`0001`–`0007`). Deploy applies them during `npm run build` (`db:migrate`) against persistent Neon. Preview applies the same files to in-memory PGLite.

Two database roles:

| Role | Bypasses RLS | Used for |
| --- | --- | --- |
| Connecting owner / `postgres` | Yes | Migrations, Better Auth, bootstrap, first-login insert, trusted audit writes |
| `titlebridge_app` (`NOSUPERUSER`, `NOBYPASSRLS`) | No | Ordinary customer and staff requests |

`getSql()` **fails closed** unless it runs inside `withRlsContext` (`SET LOCAL ROLE titlebridge_app` plus `app.user_id` / `app.role`). It never falls back to the privileged client. `getServiceSql()` is reserved for authorized service-only paths.

Application-level `user_id` scoping remains defense-in-depth.

## Document storage

- Private application vault (`document_blobs` BYTEA) — **not** a public bucket
- Authorization is checked **before** a signed URL is issued
- Signed URLs expire in **5 minutes** and are re-checked on download
- Downloads are `attachment` with `Cache-Control: no-store`
- Executables and mismatched magic bytes are rejected
- Production stores blobs in persistent Postgres (Neon), not the preview in-memory database

## Audit model

Append-only `audit_logs` (UPDATE/DELETE rejected by trigger). The application role cannot INSERT. Trusted server-side `writeAudit` uses the privileged service connection.

Events include signup, login, logout, onboarding, profile, vehicle, VIN, ownership, document upload/view/download, title-case create/submit/review, assignment, lien, and admin role/org actions. Actor user id and role are recorded on document view/download.

## Local development (GitHub clone)

```bash
npm install
cp .env.example .env.local   # leave DATABASE_URL empty for in-memory PGLite
npm run dev
```

Create an account, complete onboarding, then add a vehicle and title case.

See [CONTRIBUTING.md](CONTRIBUTING.md) for schema, security, and test rules.

## Source control

This repository is ready for GitHub preservation. [`.gitignore`](.gitignore) excludes `.env`, `.env.*` (except `.env.example`), secrets, credential dumps, uploaded documents, build output, and QA screenshots. Keep migrations, tests, and docs in version control.

Do not commit `DATABASE_URL`, `BETTER_AUTH_SECRET`, or broker client secrets.

## Environment setup

Do not commit secrets. Never add a `.env` file in the App Builder sandbox. Hosted production injects values. See [`.env.example`](.env.example).

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon Postgres when deployed. **Required in hosted production.** Unset → local PGLite. |
| `BETTER_AUTH_SECRET` | server | Session signing. **Required in hosted production.** |
| `BETTER_AUTH_URL` | server | Public origin for auth callbacks. |
| `GROK_AUTH_*` | server | Broker client credentials. |
| `VITE_AUTH_ENABLED` | build | Auth is on unless this is `"false"`. |

Hosted production (`VERCEL`) **refuses to start** on the in-memory preview database or an ephemeral auth secret.

Development seed/demo organizations load only on local PGLite preview. They never load when `NODE_ENV=production`, `VERCEL`, or `DATABASE_URL` is set. No automatic test users are created in production.

## Tests

```text
npm test
npm run typecheck
npm run lint
npm run build
```

Coverage includes VIN checksums, document sniffing, RBAC, customer isolation, RLS two-account enforcement, role escalation, audit immutability, production seed/config guards, and adapter “Provider not configured” responses.

## Known limitations

- No live DMV, AAMVA, NMVTIS, ELT, EVR/ERT, payment, or identity-verification providers
- Password reset does not send email
- Lien `verified` is blocked without a configured provider
- Rate limiting is in-process (not a shared store)
- Preview database is wiped on server restart; production Neon is persistent

## License / branding

Working name: TitleBridge. Branding is intentionally simple so it can be replaced later.
