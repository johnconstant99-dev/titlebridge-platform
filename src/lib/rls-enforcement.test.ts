import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { DOCUMENT_URL_TTL_SECONDS } from "./constants.ts";
import {
  allowDevelopmentSeed,
  assertHostedProductionConfig,
  isHostedProduction,
  isProductionRuntime,
} from "./runtime-env.ts";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");
const APP_ROLE = "titlebridge_app";

type Tx = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>;
  exec: (text: string) => Promise<unknown>;
};

async function applyMigrations(pg: PGlite) {
  await pg.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const files = readdirSync(MIGRATIONS_DIR);
  const doneRows = await pg.query<{ name: string }>("select name from _migrations");
  const done = doneRows.rows.map((row) => row.name);
  for (const { name } of pendingMigrations(files, done)) {
    const text = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
    await pg.transaction(async (tx) => {
      await tx.exec(text);
      await tx.query("insert into _migrations (name) values ($1)", [name]);
    });
  }
}

async function asApp<T>(
  pg: PGlite,
  userId: string,
  role: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return pg.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${APP_ROLE}`);
    await tx.query("select set_config('app.user_id', $1, true)", [userId]);
    await tx.query("select set_config('app.role', $1, true)", [role]);
    return fn(tx);
  });
}

async function seedTwoCustomers(pg: PGlite) {
  await pg.exec(`
    insert into profiles (id, user_id, first_name, last_name, state, onboarding_completed)
    values
      ('pro-a', 'user-a', 'Ava', 'Owner', 'TX', true),
      ('pro-b', 'user-b', 'Ben', 'Buyer', 'CA', true),
      ('pro-admin', 'user-admin', 'Ada', 'Admin', 'NY', true);
    insert into user_roles (id, user_id, role, assigned_by) values
      ('rol-a', 'user-a', 'CUSTOMER', 'system'),
      ('rol-b', 'user-b', 'CUSTOMER', 'system'),
      ('rol-admin-c', 'user-admin', 'CUSTOMER', 'system'),
      ('rol-admin', 'user-admin', 'ADMIN', 'system');
    insert into vehicles (
      id, owner_user_id, display_name, status, vin, vin_normalized, year, make, model,
      vin_format_valid, vin_checksum_valid, verification_status
    ) values
      ('veh-a', 'user-a', 'Ava Truck', 'active', '1HGCM82633A004352', '1HGCM82633A004352', 2018, 'Honda', 'Accord', true, true, 'format_validated'),
      ('veh-b', 'user-b', 'Ben Sedan', 'active', '1HGCM82633A004360', '1HGCM82633A004360', 2019, 'Toyota', 'Camry', true, true, 'format_validated');
    insert into vehicle_ownership (
      id, vehicle_id, owner_user_id, ownership_type, owner_name, verification_status
    ) values
      ('own-a', 'veh-a', 'user-a', 'sole', 'Ava Owner', 'self_reported'),
      ('own-b', 'veh-b', 'user-b', 'sole', 'Ben Buyer', 'self_reported');
    insert into vehicle_liens (id, vehicle_id, owner_user_id, status, lienholder_name)
    values
      ('lien-a', 'veh-a', 'user-a', 'customer_reports_lien', 'Harbor Bank'),
      ('lien-b', 'veh-b', 'user-b', 'customer_reports_no_lien', null);
    insert into odometer_records (id, vehicle_id, owner_user_id, reading, unit, source)
    values
      ('odo-a', 'veh-a', 'user-a', 12000, 'miles', 'customer_reported'),
      ('odo-b', 'veh-b', 'user-b', 44000, 'miles', 'customer_reported');
    insert into cases (id, case_number, customer_id, case_type, status)
    values
      ('cse-a', 'TB-2026-000001', 'user-a', 'title_transfer', 'under_review'),
      ('cse-b', 'TB-2026-000002', 'user-b', 'title_transfer', 'draft');
    insert into title_cases (
      id, case_id, vehicle_id, customer_id, transaction_type, current_step, title_state
    ) values
      ('ttl-a', 'cse-a', 'veh-a', 'user-a', 'title_transfer', 'submitted', 'TX'),
      ('ttl-b', 'cse-b', 'veh-b', 'user-b', 'title_transfer', 'ownership', 'CA');
    insert into documents (
      id, owner_user_id, vehicle_id, title_case_id, document_type, file_name,
      content_type, byte_size, status, vault
    ) values
      ('doc-a', 'user-a', 'veh-a', 'ttl-a', 'title', 'a-title.pdf', 'application/pdf', 8, 'available', 'application_private'),
      ('doc-b', 'user-b', 'veh-b', 'ttl-b', 'title', 'b-title.pdf', 'application/pdf', 8, 'available', 'application_private');
    insert into document_blobs (id, document_id, content) values
      ('blob-a', 'doc-a', decode('255044462d312e34', 'hex')),
      ('blob-b', 'doc-b', decode('255044462d312e34', 'hex'));
    insert into notifications (id, user_id, type, title, message) values
      ('ntf-a', 'user-a', 'welcome', 'Hello A', 'Private to A'),
      ('ntf-b', 'user-b', 'welcome', 'Hello B', 'Private to B');
  `);
}

describe("clean database migrations", () => {
  it("applies 0001 through 0007 on an empty database", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    await applyMigrations(pg);
    const applied = await pg.query<{ name: string }>(
      "select name from _migrations order by name",
    );
    assert.deepEqual(
      applied.rows.map((row) => row.name),
      [
        "0001_auth.sql",
        "0002_titlebridge.sql",
        "0003_phase1b.sql",
        "0004_phase1b_rls.sql",
        "0005_phase1b_review_rls.sql",
        "0006_rls_enforcement.sql",
        "0007_audit_service.sql",
      ],
    );
    const role = await pg.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      "select rolsuper, rolbypassrls from pg_roles where rolname = $1",
      [APP_ROLE],
    );
    assert.equal(role.rows.length, 1);
    assert.equal(role.rows[0]?.rolsuper, false);
    assert.equal(role.rows[0]?.rolbypassrls, false);
    await pg.close();
  });
});

describe("Customer A vs Customer B RLS isolation", () => {
  it("blocks SELECT, INSERT, UPDATE, and DELETE of Customer B records", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    await applyMigrations(pg);
    await seedTwoCustomers(pg);

    const ownerCount = await pg.query<{ n: number }>(
      "select count(*)::int as n from vehicles",
    );
    assert.equal(ownerCount.rows[0]?.n, 2, "table owner / superuser still bypasses RLS");

    await asApp(pg, "user-a", "CUSTOMER", async (tx) => {
      const who = await tx.query<{ current_user: string }>("select current_user");
      assert.equal(who.rows[0]?.current_user, APP_ROLE);

      const tables: Array<{ sql: string; id: string }> = [
        { sql: "select id from vehicles where id = $1", id: "veh-b" },
        { sql: "select id from vehicle_ownership where id = $1", id: "own-b" },
        { sql: "select id from vehicle_liens where id = $1", id: "lien-b" },
        { sql: "select id from odometer_records where id = $1", id: "odo-b" },
        { sql: "select id from title_cases where id = $1", id: "ttl-b" },
        { sql: "select id from documents where id = $1", id: "doc-b" },
        { sql: "select id from document_blobs where document_id = $1", id: "doc-b" },
        { sql: "select id from notifications where id = $1", id: "ntf-b" },
        { sql: "select id from profiles where user_id = $1", id: "user-b" },
        { sql: "select id from cases where id = $1", id: "cse-b" },
      ];
      for (const item of tables) {
        const rows = await tx.query(item.sql, [item.id]);
        assert.equal(rows.rows.length, 0, `A must not SELECT B via ${item.sql}`);
      }

      const ownVehicle = await tx.query("select id from vehicles where id = $1", ["veh-a"]);
      assert.equal(ownVehicle.rows.length, 1);

      const guessedBlob = await tx.query(
        "select encode(content, 'hex') as hex from document_blobs where document_id = $1",
        ["doc-b"],
      );
      assert.equal(guessedBlob.rows.length, 0, "knowing a document id is not authorization");
    });

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query(
            `insert into vehicles (
              id, owner_user_id, display_name, status, vin_normalized, year, make, model
            ) values ('veh-x', 'user-b', 'Stolen', 'active', '1HGCM82633A004378', 2010, 'Ford', 'Focus')`,
          );
        }),
      /row-level security/i,
    );

    await asApp(pg, "user-a", "CUSTOMER", async (tx) => {
      const updated = await tx.query(
        "update vehicles set display_name = 'Hijacked' where id = $1 returning id",
        ["veh-b"],
      );
      assert.equal(updated.rows.length, 0);
      const deleted = await tx.query("delete from documents where id = $1 returning id", ["doc-b"]);
      assert.equal(deleted.rows.length, 0);
      const notes = await tx.query("delete from notifications where id = $1 returning id", [
        "ntf-b",
      ]);
      assert.equal(notes.rows.length, 0);
      const ownership = await tx.query(
        "update vehicle_ownership set owner_name = 'Ava' where id = $1 returning id",
        ["own-b"],
      );
      assert.equal(ownership.rows.length, 0);
      const liens = await tx.query(
        "update vehicle_liens set lienholder_name = 'Ava' where id = $1 returning id",
        ["lien-b"],
      );
      assert.equal(liens.rows.length, 0);
      const titles = await tx.query(
        "update title_cases set title_state = 'TX' where id = $1 returning id",
        ["ttl-b"],
      );
      assert.equal(titles.rows.length, 0);
      const profiles = await tx.query(
        "update profiles set first_name = 'Nope' where user_id = $1 returning id",
        ["user-b"],
      );
      assert.equal(profiles.rows.length, 0);
    });

    const stillThere = await pg.query<{ n: number }>(
      "select count(*)::int as n from vehicles where id = 'veh-b'",
    );
    assert.equal(stillThere.rows[0]?.n, 1);
    await pg.close();
  });
});

describe("staff and admin privileges at the database boundary", () => {
  it("stops customers from assigning cases, writing reviews, promoting roles, or verifying liens", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    await applyMigrations(pg);
    await seedTwoCustomers(pg);

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query("update cases set assigned_to = $2 where id = $1", ["cse-a", "user-a"]);
        }),
      /cannot assign cases/i,
    );

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query(
            `insert into title_case_reviews (
              id, title_case_id, section, action, note, actor_user_id
            ) values ('rev-x', 'ttl-a', 'case', 'approved', 'nope', 'user-a')`,
          );
        }),
      /row-level security/i,
    );

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query(
            "insert into user_roles (id, user_id, role, assigned_by) values ('rol-x', 'user-a', 'ADMIN', 'user-a')",
          );
        }),
      /row-level security/i,
    );

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query("update vehicle_liens set status = 'verified' where id = $1", ["lien-a"]);
        }),
      /configured provider/i,
    );

    const internal = await asApp(pg, "user-a", "CUSTOMER", async (tx) => {
      const orgs = await tx.query("select id from organizations");
      const audit = await tx.query("select id from audit_logs");
      const settings = await tx.query("select key from platform_settings");
      return {
        orgs: orgs.rows.length,
        audit: audit.rows.length,
        settings: settings.rows.length,
      };
    });
    assert.equal(internal.orgs, 0);
    assert.equal(internal.audit, 0);
    assert.equal(internal.settings, 0);
    await pg.close();
  });

  it("stops a normal admin from granting SUPER_ADMIN, including to themselves", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    await applyMigrations(pg);
    await seedTwoCustomers(pg);

    await assert.rejects(
      () =>
        asApp(pg, "user-admin", "ADMIN", async (tx) => {
          await tx.query(
            "insert into user_roles (id, user_id, role, assigned_by) values ('rol-sa', 'user-admin', 'SUPER_ADMIN', 'user-admin')",
          );
        }),
      /row-level security/i,
    );
    await assert.rejects(
      () =>
        asApp(pg, "user-admin", "ADMIN", async (tx) => {
          await tx.query(
            "insert into user_roles (id, user_id, role, assigned_by) values ('rol-sa2', 'user-a', 'SUPER_ADMIN', 'user-admin')",
          );
        }),
      /row-level security/i,
    );
    const roles = await pg.query("select role from user_roles where role = 'SUPER_ADMIN'");
    assert.equal(roles.rows.length, 0);
    await pg.close();
  });
});

describe("private documents and audit immutability", () => {
  it("keeps signed URLs short-lived and records actor plus role on view/download SQL", async () => {
    assert.equal(DOCUMENT_URL_TTL_SECONDS, 300);
    const files = readFileSync("src/routes/api/files.ts", "utf8");
    const vehicles = readFileSync("src/server/vehicles.ts", "utf8");
    const vault = readFileSync("src/server/vault.ts", "utf8");
    assert.match(files, /actorRole: actor\.primaryRole/);
    assert.match(files, /document\.downloaded/);
    assert.match(files, /withRlsContext/);
    assert.match(vehicles, /actorRole: actor\.primaryRole/);
    assert.match(vehicles, /document\.viewed/);
    assert.match(vault, /DOCUMENT_URL_TTL_SECONDS/);
    assert.match(vault, /document:read:any/);
  });

  it("lets the owner append document audit events and rejects mutation of audit_logs", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    await applyMigrations(pg);
    await seedTwoCustomers(pg);

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query(
            `insert into audit_logs (
              id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
            ) values ('aud-view', 'user-a', 'CUSTOMER', 'document.viewed', 'document', 'doc-a', '{}'::jsonb)`,
          );
        }),
      /permission denied/i,
    );

    await assert.rejects(
      () =>
        asApp(pg, "user-admin", "ADMIN", async (tx) => {
          await tx.query(
            `insert into audit_logs (
              id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
            ) values ('aud-admin', 'user-admin', 'ADMIN', 'document.viewed', 'document', 'doc-a', '{}'::jsonb)`,
          );
        }),
      /permission denied/i,
    );

    await pg.query(
      `insert into audit_logs (
        id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
      ) values
        ('aud-view', 'user-a', 'CUSTOMER', 'document.viewed', 'document', 'doc-a', '{}'::jsonb),
        ('aud-dl', 'user-a', 'CUSTOMER', 'document.downloaded', 'document', 'doc-a', '{}'::jsonb)`,
    );

    await asApp(pg, "user-a", "CUSTOMER", async (tx) => {
      const rows = await tx.query(
        "select actor_user_id, actor_role, action from audit_logs order by action",
      );
      assert.equal(rows.rows.length, 0, "customers cannot read audit history");
    });

    const stored = await pg.query<{ actor_role: string; action: string }>(
      "select actor_role, action from audit_logs order by action",
    );
    assert.deepEqual(
      stored.rows.map((row) => `${row.action}:${row.actor_role}`),
      ["document.downloaded:CUSTOMER", "document.viewed:CUSTOMER"],
    );

    await assert.rejects(
      () => pg.query("update audit_logs set action = 'tamper' where id = 'aud-view'"),
      /append-only/i,
    );
    await assert.rejects(
      () => pg.query("delete from audit_logs where id = 'aud-dl'"),
      /append-only/i,
    );

    await asApp(pg, "user-a", "CUSTOMER", async (tx) => {
      await tx.exec("SAVEPOINT tb_service");
      await tx.exec("RESET ROLE");
      const who = await tx.query<{ current_user: string }>("select current_user");
      assert.notEqual(who.rows[0]?.current_user, APP_ROLE);
      await tx.query(
        `insert into audit_logs (
          id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
        ) values ('aud-svc', 'user-a', 'CUSTOMER', 'document.viewed', 'document', 'doc-a', '{}'::jsonb)`,
      );
      await tx.exec(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.exec("RELEASE SAVEPOINT tb_service");
    });

    await assert.rejects(
      () =>
        asApp(pg, "user-a", "CUSTOMER", async (tx) => {
          await tx.query(
            `insert into audit_logs (
              id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
            ) values ('aud-direct', 'user-a', 'CUSTOMER', 'document.viewed', 'document', 'doc-a', '{}'::jsonb)`,
          );
        }),
      /permission denied/i,
    );

    const serviceWritten = await pg.query<{ n: number }>(
      "select count(*)::int as n from audit_logs where id = 'aud-svc'",
    );
    assert.equal(serviceWritten.rows[0]?.n, 1);
    await pg.close();
  });
});

describe("production configuration", () => {
  it("never enables development seed data in production, Vercel, or DATABASE_URL environments", () => {
    assert.equal(isProductionRuntime({ NODE_ENV: "production" }), true);
    assert.equal(isProductionRuntime({ VERCEL: "1" }), true);
    assert.equal(isProductionRuntime({ DATABASE_URL: "postgres://example" }), true);
    assert.equal(isProductionRuntime({ NODE_ENV: "development" }), false);
    assert.equal(
      allowDevelopmentSeed({ env: { NODE_ENV: "production" }, dbSource: "pglite" }),
      false,
    );
    assert.equal(
      allowDevelopmentSeed({ env: { VERCEL: "1" }, dbSource: "pglite" }),
      false,
    );
    assert.equal(
      allowDevelopmentSeed({
        env: { DATABASE_URL: "postgres://example" },
        dbSource: "neon",
      }),
      false,
    );
    assert.equal(allowDevelopmentSeed({ env: { NODE_ENV: "development" }, dbSource: "pglite" }), true);
    assert.equal(allowDevelopmentSeed({ env: { NODE_ENV: "development" }, dbSource: "neon" }), false);
  });

  it("fails closed in hosted production if DATABASE_URL or BETTER_AUTH_SECRET is missing", () => {
    assert.equal(isHostedProduction({ VERCEL: "1" }), true);
    assert.equal(isHostedProduction({ NODE_ENV: "production" }), false);
    assert.throws(
      () => assertHostedProductionConfig({ env: { VERCEL: "1" }, databaseUrl: "" }),
      /DATABASE_URL is required in hosted production/,
    );
    assert.throws(
      () =>
        assertHostedProductionConfig({
          env: { VERCEL: "1" },
          databaseUrl: "postgres://example",
        }),
      /BETTER_AUTH_SECRET is required in hosted production/,
    );
    assert.doesNotThrow(() =>
      assertHostedProductionConfig({
        env: { VERCEL: "1", BETTER_AUTH_SECRET: "hosted-secret" },
        databaseUrl: "postgres://example",
      }),
    );
    assert.doesNotThrow(() =>
      assertHostedProductionConfig({ env: { NODE_ENV: "production" }, databaseUrl: "" }),
    );
  });
});
