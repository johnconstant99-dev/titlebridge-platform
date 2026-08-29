# Database

Schema is applied from `migrations/*.sql`.

- `0001_auth.sql` — Better Auth (`user`, `session`, `account`, `verification`). Do not edit.
- `0002_titlebridge.sql` — application tables, sequences, append-only triggers, RLS policies.
- `0003_phase1b.sql` — vehicles, ownership, liens, odometer, title cases, reviews, document vault.
- `0004_phase1b_rls.sql` — staff lien update and case assignment RLS policies.
- `0005_phase1b_review_rls.sql` — staff title-case review updates, customer notifications, and compliance-flag writes.
- `0006_rls_enforcement.sql` — `titlebridge_app` role (NOSUPERUSER NOBYPASSRLS), grants, missing policies, assignment/lien triggers.
- `0007_audit_service.sql` — revoke audit_logs writes from `titlebridge_app`; trusted server handlers write audit on the privileged connection.

Preview applies migrations automatically to in-memory PGLite (wiped on restart). Deploy applies them during `npm run build` (`db:migrate`) to **persistent Neon**. Hosted production refuses to start without `DATABASE_URL`.

## Application tables

| Table | Purpose |
| --- | --- |
| `profiles` | Onboarding profile for a user |
| `user_roles` | RBAC assignments |
| `organizations` | Future dealerships, lenders, fleets, agencies |
| `organization_members` | Membership |
| `cases` | Foundational case records |
| `case_notes` | Internal or customer-visible notes |
| `consent_records` | Append-only legal consents |
| `audit_logs` | Append-only audit history |
| `notifications` | Per-user notices |
| `integration_providers` | Provider catalog (no secrets) |
| `state_configurations` | Per-state capability flags (all unverified) |
| `vehicles` | Customer vehicles with full VIN server-side; unique `(owner_user_id, vin_normalized)` |
| `vehicle_ownership` | Self-reported ownership history |
| `vehicle_liens` | Lien statements (never auto-verified from customer input) |
| `odometer_records` | Customer-reported odometer readings |
| `title_cases` | Multi-step title workflow, 1:1 with `cases` |
| `title_case_reviews` | Internal review actions |
| `documents` | Private document metadata |
| `document_blobs` | Private BYTEA vault (not public object storage) |
| `identity_verification_records` | Placeholder IDV |
| `risk_flags` | Compliance flags |
| `compliance_events` | Compliance event log |
| `platform_settings` | Non-secret settings |

`user_id` columns are `TEXT`.

Clients receive a masked VIN. The full VIN is stored on the server only.

## Roles

| Role | Bypasses RLS | Used for |
| --- | --- | --- |
| Connecting owner / `postgres` superuser | Yes (table owner or superuser) | Migrations, Better Auth, bootstrap, first-login profile/role insert, trusted audit writes |
| `titlebridge_app` | No (`NOSUPERUSER`, `NOBYPASSRLS`) | Ordinary customer and staff requests via `SET LOCAL ROLE` |

Ordinary application queries never use the privileged connection. `getSql()` fails closed unless it is inside `withRlsContext` (`SET LOCAL ROLE titlebridge_app` plus `app.user_id` / `app.role`). `getServiceSql()` is reserved for migrations, Better Auth, bootstrap, first-login inserts, and trusted audit writes. Neon pooled connections do not persist session `SET`, so those settings are `SET LOCAL` / `set_config(..., true)` per request.

## Policies

Row Level Security is enabled on per-user, staff, and catalog tables. Policies key off `app.user_id` and `app.role`. Application-level scoping remains defense-in-depth.

Staff review policies cover title-case updates, case assignment, customer notifications, and compliance flags. `audit_logs` and `consent_records` have triggers that reject UPDATE and DELETE. The application role cannot INSERT audit events — `writeAudit` uses the privileged service connection. Customers cannot assign cases or mark liens `verified` even with raw SQL as `titlebridge_app`. Admins cannot insert `SUPER_ADMIN` through the application role.
