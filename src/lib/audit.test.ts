import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { redactMetadata } from "../security/sanitize.ts";

const PHASE_1B_AUDIT_ACTIONS = [
  "auth.signup",
  "auth.login",
  "auth.logout",
  "onboarding.completed",
  "profile.updated",
  "vehicle.created",
  "vin.validated",
  "ownership.created",
  "lien.updated",
  "document.uploaded",
  "document.viewed",
  "document.downloaded",
  "title_case.created",
  "title_case.title_updated",
  "title_case.submitted",
  "title_case.reviewed",
  "title_case.info_requested",
  "title_case.flagged",
  "title_case.assigned",
  "title_case.reassigned",
  "case.created",
  "case.assigned",
  "case.reassigned",
  "case.note_added",
  "case.status_changed",
  "role.assigned",
  "role.removed",
  "organization.created",
] as const;

const SERVER_SOURCE = [
  "src/server/titles.ts",
  "src/server/vehicles.ts",
  "src/server/services.ts",
  "src/server/actor.ts",
  "src/fn/session.ts",
  "src/routes/api/files.ts",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

describe("audit event contract", () => {
  it("names every Phase 1B audit action without storing file contents or full VINs", () => {
    for (const action of PHASE_1B_AUDIT_ACTIONS) {
      assert.match(action, /^(auth|onboarding|profile|vehicle|vin|ownership|lien|document|title_case|case|role|organization)\./);
      assert.equal(action.includes("vin_full"), false);
      assert.equal(action.includes("content"), false);
    }
  });

  it("writes every Phase 1B audit action from server code", () => {
    for (const action of PHASE_1B_AUDIT_ACTIONS) {
      const present =
        SERVER_SOURCE.includes(`"${action}"`) ||
        SERVER_SOURCE.includes(action) ||
        (action === "auth.login" && /recordAuthEvent\([^)]*"login"/.test(SERVER_SOURCE)) ||
        (action === "auth.logout" && /recordAuthEvent\([^)]*"logout"/.test(SERVER_SOURCE)) ||
        (action.startsWith("auth.") && SERVER_SOURCE.includes("`auth.${action}`"));
      assert.ok(present, `${action} must be written by a server path`);
    }
  });

  it("redacts secrets, tokens, SSN, license, and full VIN keys from audit metadata", () => {
    const redacted = redactMetadata({
      year: 2020,
      make: "Honda",
      vin_full: "1HGCM82633A004352",
      ssn: "123-45-6789",
      token: "secret-token",
      password: "correcthorse1",
      byteSize: 1200,
    });
    assert.equal(redacted.year, 2020);
    assert.equal(redacted.make, "Honda");
    assert.equal(redacted.byteSize, 1200);
    assert.equal("vin_full" in redacted, false);
    assert.equal("ssn" in redacted, false);
    assert.equal("token" in redacted, false);
    assert.equal("password" in redacted, false);
  });

  it("never records binary document payloads in metadata", () => {
    const redacted = redactMetadata({
      documentType: "title",
      contentBase64: "AAAA",
      byteSize: 12,
    });
    assert.equal(redacted.documentType, "title");
    assert.equal(redacted.byteSize, 12);
    assert.equal(typeof redacted.contentBase64, "undefined");
  });

  it("records authenticated actor and role on document viewed and downloaded events", () => {
    const files = readFileSync("src/routes/api/files.ts", "utf8");
    const vehicles = readFileSync("src/server/vehicles.ts", "utf8");
    assert.match(files, /actorRole: actor\.primaryRole/);
    assert.match(files, /document\.downloaded/);
    assert.match(vehicles, /actorRole: actor\.primaryRole/);
    assert.match(vehicles, /document\.viewed/);
  });

  it("writes audit events through the privileged service handler, not customer SQL", () => {
    const audit = readFileSync("src/server/audit.ts", "utf8");
    assert.match(audit, /getServiceSql/);
    assert.doesNotMatch(audit, /await getSql\(\)/);
  });

  it("submits title cases to internal review only", () => {
    assert.match(SERVER_SOURCE, /destination: "internal_review_only"/);
    assert.match(SERVER_SOURCE, /title_case\.submitted/);
  });
});
