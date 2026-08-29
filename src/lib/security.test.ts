import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { toAuthClientMessage, toClientError } from "./errors.ts";

const SCHEMA = [
  "migrations/0002_titlebridge.sql",
  "migrations/0003_phase1b.sql",
  "migrations/0004_phase1b_rls.sql",
  "migrations/0005_phase1b_review_rls.sql",
  "migrations/0006_rls_enforcement.sql",
  "migrations/0007_audit_service.sql",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

describe("RLS and security schema", () => {
  const tables = [
    "profiles",
    "user_roles",
    "cases",
    "case_notes",
    "consent_records",
    "audit_logs",
    "notifications",
    "vehicles",
    "vehicle_ownership",
    "vehicle_liens",
    "odometer_records",
    "title_cases",
    "title_case_reviews",
    "documents",
    "document_blobs",
    "identity_verification_records",
    "risk_flags",
    "compliance_events",
  ];

  it("enables row level security on every customer and staff table", () => {
    for (const table of tables) {
      assert.match(
        SCHEMA,
        new RegExp(`alter table ${table} enable row level security`, "i"),
        `${table} must enable RLS`,
      );
    }
  });

  it("scopes vehicles, title cases, documents, and liens to the owner", () => {
    assert.match(SCHEMA, /customer_id = current_setting\('app\.user_id', true\)/);
    assert.match(SCHEMA, /owner_user_id = current_setting\('app\.user_id', true\)/);
    assert.match(SCHEMA, /vehicle_liens_own/);
    assert.match(SCHEMA, /title_cases_own/);
    assert.match(SCHEMA, /document_blobs_own/);
  });

  it("lets staff inspect vehicles, documents, and title cases", () => {
    assert.match(SCHEMA, /vehicles_staff_read/);
    assert.match(SCHEMA, /documents_staff_read/);
    assert.match(SCHEMA, /title_cases_staff/);
    assert.match(SCHEMA, /document_blobs_staff/);
  });

  it("lets staff update liens during internal review without marking them verified in SQL", () => {
    assert.match(SCHEMA, /vehicle_liens_staff_update/);
    assert.match(SCHEMA, /lien verification requires a configured provider/);
  });

  it("lets staff update title cases and review case status during internal review", () => {
    assert.match(SCHEMA, /title_cases_staff_update/);
    assert.match(SCHEMA, /cases_staff_review_update/);
    assert.match(SCHEMA, /cases_staff_assign/);
  });

  it("lets staff notify customers and write compliance flags; audit is service-only", () => {
    assert.match(SCHEMA, /notifications_staff_insert/);
    assert.match(SCHEMA, /risk_flags_staff_write/);
    assert.match(SCHEMA, /compliance_events_staff_write/);
    assert.match(SCHEMA, /revoke insert, update, delete on audit_logs from titlebridge_app/i);
  });

  it("creates a restricted application role that cannot bypass RLS", () => {
    assert.match(SCHEMA, /create role titlebridge_app nosuperuser nobypassrls/i);
    assert.match(SCHEMA, /grant titlebridge_app to %I/);
    assert.match(SCHEMA, /grant select, insert, update, delete on/i);
    assert.match(SCHEMA, /role <> 'SUPER_ADMIN'/);
    assert.match(SCHEMA, /customers cannot assign cases/);
    assert.match(SCHEMA, /lien verification requires a configured provider/);
  });

  it("keeps audit and consent records append-only", () => {
    assert.match(SCHEMA, /audit_logs are append-only/);
    assert.match(SCHEMA, /consent_records are append-only/);
  });
});

describe("error sanitization", () => {
  it("does not leak SQL column names to the client", () => {
    const client = toClientError(new Error('column "vin_normalized" does not exist'));
    assert.equal(client.message, "Something went wrong. Please try again.");
    assert.equal(client.status, 500);
  });

  it("still returns short validation messages", () => {
    const client = toClientError(new Error("VIN is required"));
    assert.equal(client.message, "VIN is required");
  });

  it("hides Better Auth origin and network failures from the sign-in form", () => {
    assert.equal(
      toAuthClientMessage("Invalid origin", "Sign-in failed. Check your email and password."),
      "Sign-in failed. Check your email and password.",
    );
    assert.equal(
      toAuthClientMessage("Invalid email or password", "Sign-in failed. Check your email and password."),
      "Invalid email or password",
    );
  });
});

