# Security model

Phase 1B Private Beta.

## Authentication

Better Auth issues same-origin sessions. Live preview may use a bearer token because of partitioned cookies. Server functions attach that token through `authMiddleware`. Hosted production requires `BETTER_AUTH_SECRET`; the ephemeral preview secret is not used there.

## Authorization

| Role | Can | Cannot |
| --- | --- | --- |
| CUSTOMER | Own profile, vehicles, ownership, liens, documents, title cases, notifications | Other customers, admin, verification decisions, config |
| OPERATIONS | Review cases and title cases, inspect any vehicle/document, internal notes, permitted statuses, assign cases | Security config, promote admins, secrets, flag for compliance |
| COMPLIANCE | Review, IDV records, compliance events, risk flags, audit, consents | Role promotion, secrets |
| ADMIN | Users, assignable roles, orgs, settings, health, audit, review | Assign `SUPER_ADMIN`, read auth secrets |
| SUPER_ADMIN | Highest internal administration | Assignable through the UI — reserved |

Staff routes still re-check permissions on the server. Browser-side request tampering cannot grant a role the actor does not have.

## Isolation

Customer A cannot read Customer B records. This is enforced twice:

1. **Row Level Security** on the `titlebridge_app` role using `app.user_id` / `app.role`. `getSql()` does not fall back to the table-owner connection.
2. **Application scoping** for profile, vehicles, ownership, documents, title cases, liens, odometer, and notifications to the authenticated `user_id` / `customer_id` unless the actor has a staff read permission (`vehicle:read:any`, `document:read:any`, `case:read:any`).

Case assignment and reassignment require `case:assign` (OPERATIONS, ADMIN, SUPER_ADMIN). Compliance can review and flag but cannot assign. Staff lien updates cannot mark a lien `verified` without a configured provider. Operations can approve a case to `ready_for_submission`; only ADMIN / SUPER_ADMIN may mark it `completed`.

Knowing a document ID or storage key is not authorization. Signed download URLs expire in 5 minutes and are re-checked against the authenticated actor and RLS.

## Documents

- Private application vault (Postgres BYTEA), not a public bucket
- MIME allowlist (PDF, JPEG, PNG, WebP) with magic-byte sniffing
- 5 MB size limit and sanitized filenames
- 5-minute signed download URLs; downloads are `attachment` with `Cache-Control: no-store`
- Audit events for upload, view, and download — never file contents

## VIN and liens

- ISO 3779 checksum validation; characters I, O, and Q are rejected
- Display is “VIN format validated”, never “Vehicle verified”
- Duplicate VIN per owner is rejected (409)
- Customer lien statuses are limited to unknown / reports no lien / reports lien
- Staff cannot mark a lien verified without a configured provider

## Other controls

- Input validation with Zod
- Output mapping that omits internal notes, full VINs, and secrets
- Rate-limit architecture on HTTP APIs
- Secure response headers on `/api/*`
- Error sanitization (no stack traces or SQL in the UI)
- Audit events for signup, login, logout, onboarding, profile, vehicles, VIN, ownership, documents, title cases, liens, internal review, assignment, and compliance flags. Customers cannot INSERT audit rows; trusted server-side `writeAudit` writes them.
- No SSN or driver’s-license collection in Phase 1B Private Beta
