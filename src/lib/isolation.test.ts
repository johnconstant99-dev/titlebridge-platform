import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canAccessCase, canAccessOwned, canSeeInternalNote, publicProfileView } from "./rbac.ts";

describe("customer data isolation", () => {
  const userA = "user-a";
  const userB = "user-b";

  it("User A must never retrieve User B private case records", () => {
    const allowed = canAccessCase({
      actorId: userA,
      actorRoles: ["CUSTOMER"],
      customerId: userB,
    });
    assert.equal(allowed, false);
  });

  it("User A must never retrieve User B profile records", () => {
    const allowed = publicProfileView({
      actorId: userA,
      actorRoles: ["CUSTOMER"],
      profileUserId: userB,
    });
    assert.equal(allowed, false);
  });

  it("User A must never retrieve User B vehicles, ownership, liens, or odometer", () => {
    assert.equal(
      canAccessOwned({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        ownerUserId: userB,
      }),
      false,
    );
    assert.equal(
      canAccessOwned({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        ownerUserId: userA,
      }),
      true,
    );
  });

  it("User A must never retrieve User B documents", () => {
    assert.equal(
      canAccessOwned({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        ownerUserId: userB,
        staffPermission: "document:read:any",
      }),
      false,
    );
  });

  it("User A cannot see internal operations notes", () => {
    assert.equal(canSeeInternalNote(["CUSTOMER"]), false);
  });

  it("User A must never retrieve User B title cases", () => {
    assert.equal(
      canAccessCase({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        customerId: userB,
      }),
      false,
    );
  });

  it("User A must never retrieve User B documents even with a guessed id", () => {
    assert.equal(
      canAccessOwned({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        ownerUserId: userB,
        staffPermission: "document:read:any",
      }),
      false,
    );
  });

  it("operations may inspect another customer's vehicle and document, customers may not", () => {
    assert.equal(
      canAccessOwned({
        actorId: "ops",
        actorRoles: ["OPERATIONS"],
        ownerUserId: userB,
        staffPermission: "document:read:any",
      }),
      true,
    );
    assert.equal(
      canAccessOwned({
        actorId: userA,
        actorRoles: ["CUSTOMER"],
        ownerUserId: userB,
        staffPermission: "vehicle:read:any",
      }),
      false,
    );
  });
});

describe("server query isolation contracts", () => {
  const titles = readFileSync("src/server/titles.ts", "utf8");
  const vehicles = readFileSync("src/server/vehicles.ts", "utf8");
  const vault = readFileSync("src/server/vault.ts", "utf8");
  const files = readFileSync("src/routes/api/files.ts", "utf8");
  const services = readFileSync("src/server/services.ts", "utf8");

  it("scopes customer vehicle and title-case lists to the authenticated owner", () => {
    assert.match(vehicles, /select \* from vehicles where owner_user_id = \$1/);
    assert.match(titles, /where t\.customer_id = \$1 order by t\.created_at desc/);
    assert.match(vehicles, /select \* from documents where owner_user_id = \$1/);
  });

  it("re-checks case and vehicle ownership before returning a guessed id", () => {
    assert.match(titles, /canAccessCase\(/);
    assert.match(vehicles, /canAccessOwned\(/);
    assert.match(vehicles, /assertVehicleAccess/);
    assert.match(titles, /throw new ForbiddenError/);
    assert.match(vehicles, /throw new ForbiddenError/);
  });

  it("keeps ownership and lien writes on the customer account, not staff", () => {
    assert.match(
      vehicles,
      /if \(String\(vehicle\.owner_user_id\) !== actor\.userId\) \{\s*throw new ForbiddenError\(\);/s,
    );
    assert.match(vehicles, /assertPermission\(actor, "vehicle:write:own"\)/);
    assert.match(vehicles, /assertPermission\(actor, "review:act"\)/);
  });

  it("requires document:read:any for staff document review and re-checks the signed URL", () => {
    assert.match(vehicles, /staffPermission: "document:read:any"/);
    assert.match(vault, /document:read:any/);
    assert.match(vault, /actorUserId !== ownerUserId/);
    assert.match(files, /document\.downloaded/);
  });

  it("requires case:assign for assignment and review:act for internal review", () => {
    assert.match(titles, /assertPermission\(actor, "review:act"\)/);
    assert.match(titles, /assertPermission\(actor, "case:assign"\)/);
    assert.match(titles, /assertPermission\(actor, "compliance:review"\)/);
    assert.match(services, /assertPermission\(actor, "case:assign"\)/);
    assert.match(services, /Assignee must be an internal staff user/);
  });

  it("runs ordinary customer access as titlebridge_app, not the table owner", () => {
    const db = readFileSync("src/lib/db.ts", "utf8");
    const session = readFileSync("src/fn/session.ts", "utf8");
    const actor = readFileSync("src/server/actor.ts", "utf8");
    const http = readFileSync("src/server/http.ts", "utf8");
    const files = readFileSync("src/routes/api/files.ts", "utf8");
    assert.match(db, /export const APP_DATABASE_ROLE = "titlebridge_app"/);
    assert.match(db, /SET LOCAL ROLE/);
    assert.match(db, /export async function withRlsContext/);
    assert.match(db, /export function getServiceSql/);
    assert.match(db, /getSql\(\) requires an RLS request context/);
    assert.match(db, /Ordinary application access cannot use the privileged database client/);
    const getSqlFn = db.match(
      /export function getSql\(\): Promise<Sql> \{[\s\S]*?\n\}/,
    )?.[0];
    assert.ok(getSqlFn, "getSql() must be defined");
    assert.match(getSqlFn, /throw new Error/);
    assert.doesNotMatch(getSqlFn, /getPrivilegedSql/);
    assert.doesNotMatch(getSqlFn, /return getServiceSql/);
    assert.match(actor, /runWithActor/);
    assert.match(actor, /getServiceSql/);
    assert.match(session, /asUser\(context\.userId/);
    assert.match(http, /withApiActor/);
    assert.match(files, /withRlsContext/);
  });

  it("keeps ordinary customer modules on getSql, not the privileged service client", () => {
    const vehicles = readFileSync("src/server/vehicles.ts", "utf8");
    const titles = readFileSync("src/server/titles.ts", "utf8");
    const vault = readFileSync("src/server/vault.ts", "utf8");
    const audit = readFileSync("src/server/audit.ts", "utf8");
    assert.doesNotMatch(vehicles, /getServiceSql/);
    assert.doesNotMatch(titles, /getServiceSql/);
    assert.doesNotMatch(vault, /getServiceSql/);
    assert.match(vehicles, /await getSql\(\)/);
    assert.match(titles, /await getSql\(\)/);
    assert.match(vault, /await getSql\(\)/);
    assert.match(audit, /getServiceSql/);
    assert.doesNotMatch(audit, /await getSql\(\)/);
  });

  it("labels the product as Phase 1B Private Beta and keeps production from using preview SQL", () => {
    const constants = readFileSync("src/lib/constants.ts", "utf8");
    const db = readFileSync("src/lib/db.ts", "utf8");
    const gitignore = readFileSync(".gitignore", "utf8");
    assert.match(constants, /PHASE_LABEL = "Phase 1B Private Beta"/);
    assert.match(constants, /CONSENT_TERMS_VERSION = "2026-08-1b"/);
    assert.doesNotMatch(constants, /2026-08-1a/);
    assert.match(db, /assertHostedProductionConfig/);
    assert.match(gitignore, /^\.env$/m);
    assert.match(gitignore, /^\.env\.\*$/m);
    assert.match(gitignore, /^!\.env\.example$/m);
    assert.match(gitignore, /^\.vercel$/m);
    assert.match(gitignore, /^\*\.pem$/m);
    assert.match(gitignore, /^uploads$/m);
  });
});
