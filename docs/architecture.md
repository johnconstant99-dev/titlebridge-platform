# TitleBridge architecture

Phase 1B Private Beta is a modular, production-oriented foundation. It does not implement live title, registration, or vehicle-record integrations.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes / pages | `src/routes/` | TanStack file routes, layouts, dashboards |
| Components | `src/components/` | UI primitives, shells, branding, title-case stepper |
| Hooks | `src/hooks/` | Client session snapshot |
| Server functions | `src/fn/` | Authorized `createServerFn` entry points |
| HTTP API | `src/routes/api/` | `/api/auth`, `/api/profile`, `/api/cases`, `/api/notifications`, `/api/organizations`, `/api/admin`, `/api/audit`, `/api/integrations`, `/api/states`, `/api/health`, `/api/files` |
| Domain services | `src/server/` | Persistence, RBAC, audit, bootstrap, vehicles, titles, vault |
| Validation | `src/lib/validation.ts`, `src/lib/vin.ts`, `src/lib/documents.ts` | Zod schemas, ISO 3779 VIN, upload sniffing |
| Security | `src/security/` | Rate limit, headers, redaction |
| Integrations | `src/integrations/` | Provider adapters (all unconfigured) |
| Database | `migrations/` | Postgres schema |

## Request path

Browser → same-origin server function or `/api/*` → `authMiddleware` / session verification → role check → `titlebridge_app` transaction with `app.user_id` / `app.role` → SQL still scoped by `context.userId` in application code → sanitized JSON.

Never trust a client-supplied user id. `getSql()` throws if the RLS context is missing.

## Title case workflow

Customer: Vehicle → Ownership → Title information → Lien information → Documents → Review → Submit for internal review.

Submit sets the linked `cases` row to `under_review` and records `title_case.submitted` with `destination: internal_review_only`. It does not file with a motor-vehicle department.

Staff may assign or reassign the case, update lien statements (never to `verified` without a provider), and open private documents through short-lived signed URLs. Those actions write `case.assigned` / `case.reassigned` or `title_case.assigned` / `title_case.reassigned`, `lien.updated`, and `document.viewed` / `document.downloaded` audit events.

Approving the case section does not file with a motor-vehicle department. Operations may move the case to `ready_for_submission`. Completing a case is reserved for ADMIN / SUPER_ADMIN.

## Document vault

Uploads are stored as private Postgres BYTEA (`document_blobs`), not a public CDN. Access uses a 5-minute HS256 URL at `/api/files?token=`. Object-storage adapters remain unconfigured. In hosted production the blobs live on persistent Neon; the in-memory preview database is never used there.

## Environments

- `local` / preview: embedded PGLite, Development Data banner, fictional orgs. Ordinary requests still run as `titlebridge_app` (RLS enforced).
- Hosted production (`VERCEL`): Neon. `DATABASE_URL` and `BETTER_AUTH_SECRET` are required or the process fails closed. Seed organizations are not inserted. `NODE_ENV=production`, `VERCEL`, and `DATABASE_URL` all disable development seed data.

Integration adapters expose sandbox, staging, and production slots. All are unconfigured in Phase 1B Private Beta.

## Production build

The production SSR bundle currently inlines the Nitro server graph (`inlineDynamicImports`) and copies PGLite WASM assets next to the function output. This is a temporary workaround for a Rolldown/Nitro facade-chunk bug that otherwise 500s every request (`Export 'ssr_exports' is not defined in module`). Remove it once https://github.com/tanstack/router/issues/8031 is fixed.

Deployed production uses Neon (`DATABASE_URL`) and does not execute the PGLite path.

## Case numbers

Format `TB-YYYY-NNNNNN` (example `TB-2026-000001`). Case numbers are human identifiers only. Authorization always uses account ownership and roles.
