import { AsyncLocalStorage } from "node:async_hooks";
import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { assertHostedProductionConfig } from "./runtime-env";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

/** Restricted application role. Cannot bypass RLS. Used for ordinary requests. */
export const APP_DATABASE_ROLE = "titlebridge_app";

export type RlsContext = {
  userId: string;
  role: string;
};

type RlsStore = {
  sql: Sql;
  actor: RlsContext;
  serviceSql: Sql;
};

// An empty/whitespace DATABASE_URL (an easy misconfig in deploy UIs) must mean
// "unset" — otherwise production would silently run on the PGLite fallback.
const rawDatabaseUrl =
  typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
const databaseUrl =
  rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : undefined;

/**
 * Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
 * sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
 * the app has a working database even with nothing configured — the live preview
 * included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
 */
export const dbSource: DbSource = databaseUrl ? "neon" : "pglite";

/**
 * Minimal shared SQL surface, satisfied by both Neon and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

/**
 * Init state lives on globalThis as promises: dev HMR creates new instances of
 * this module, and two instances racing module-level state would open a second
 * pool or run two concurrent PGLite migration passes (whose duplicate
 * `_migrations` insert rejects — and would get memoized, poisoning every later
 * `getSql()`). A failed init clears its slot so the next call retries.
 */
const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgPool__?: import("pg").Pool;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
  __dbLockChain__?: Promise<void>;
};

const rlsAls = new AsyncLocalStorage<RlsStore>();
const dbLockAls = new AsyncLocalStorage<boolean>();

/**
 * Result-type parity: Postgres sends every value as text plus a type OID — the
 * JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
 * int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
 * JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
 * production return identical, JSON-safe shapes:
 *   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
 *                                   `::text` if you ever need huge integers)
 *   date                         -> 'YYYY-MM-DD' string
 *   interval                     -> Postgres interval text
 * numeric already comes back as a string on both (arbitrary precision).
 */
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

async function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  if (dbLockAls.getStore()) return fn();
  const previous = globalRef.__dbLockChain__ ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  globalRef.__dbLockChain__ = previous.then(() => gate);
  await previous;
  try {
    return await dbLockAls.run(true, fn);
  } finally {
    release();
  }
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    // Regular Postgres driver: node-postgres (`pg`) — works directly with Neon's
    // pooled endpoint. One pool per process; warm serverless instances reuse it.
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({ connectionString: databaseUrl });
    globalRef.__pgPool__ = pool;
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  // Embedded Postgres, imported on demand so it never loads on the Neon path.
  // One in-memory instance per process, shared across HMR module instances, so
  // data survives source edits (it resets on dev-server restart).
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const origQuery = pg.query.bind(pg);
    const origExec = pg.exec.bind(pg);
    const origTransaction = pg.transaction.bind(pg);
    pg.query = ((...args: Parameters<typeof pg.query>) =>
      withDbLock(() => origQuery(...args))) as typeof pg.query;
    pg.exec = ((...args: Parameters<typeof pg.exec>) =>
      withDbLock(() => origExec(...args))) as typeof pg.exec;
    pg.transaction = ((fn: Parameters<typeof pg.transaction>[0]) =>
      withDbLock(() => origTransaction(fn))) as typeof pg.transaction;
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  // Apply migrations/ (the single schema source) so preview matches production.
  // SQL is inlined by the bundler via import.meta.glob (no runtime fs); applied
  // files are tracked in _migrations. The glob does not descend, so the opt-in
  // auth schema under migrations/auth/ stays out. Runs once per module instance
  // — so an HMR reload after adding a migration file applies it live — with
  // passes serialized on a global chain so concurrent callers never
  // double-apply.
  const migrate = async (): Promise<void> => {
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const doneRows = await pg.query<{ name: string }>(
      "select name from _migrations",
    );
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      // Apply + record atomically (parity with scripts/migrate.mjs) so a failed
      // statement can't leave a file half-applied but untracked.
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined) // an earlier failed pass must not wedge the chain
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  assertHostedProductionConfig({ databaseUrl });
  return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}

async function getPrivilegedSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return sqlPromise;
}

/**
 * Privileged/service SQL (table owner or superuser). Bypasses RLS.
 * Authorized service-only paths: migrations, Better Auth, bootstrap,
 * first-login inserts, and trusted audit writes.
 *
 * Inside an RLS request the service client RESET ROLEs on the same
 * transaction (so audit stays atomic) then restores `titlebridge_app`.
 */
export function getServiceSql(): Promise<Sql> {
  const store = rlsAls.getStore();
  if (store) return Promise.resolve(store.serviceSql);
  return getPrivilegedSql();
}

/**
 * Restricted application SQL. Fail-closed: must run inside `withRlsContext`.
 * Does not fall back to the privileged client.
 */
export function getSql(): Promise<Sql> {
  const store = rlsAls.getStore();
  if (!store) {
    throw new Error(
      "getSql() requires an RLS request context. Ordinary application access cannot use the privileged database client. Use getServiceSql() only from authorized service-only paths.",
    );
  }
  return Promise.resolve(store.sql);
}

export function isRlsContextActive(): boolean {
  return Boolean(rlsAls.getStore());
}

export function currentRlsContext(): RlsContext | null {
  return rlsAls.getStore()?.actor ?? null;
}

async function applyRlsSettings(
  query: (text: string, params?: unknown[]) => Promise<unknown>,
  actor: RlsContext,
) {
  await query(`SET LOCAL ROLE ${APP_DATABASE_ROLE}`);
  await query("select set_config('app.user_id', $1, true)", [actor.userId]);
  await query("select set_config('app.role', $1, true)", [actor.role]);
}

/**
 * One transaction queue for app (RLS) and service (RESET ROLE) queries so they
 * cannot interleave on a single Postgres client.
 */
function createScopedSql(input: {
  run: Run;
  actor: RlsContext;
  exec: (text: string) => Promise<unknown>;
}): RlsStore {
  let tail = Promise.resolve();
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn, fn);
    tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const restore = () =>
    applyRlsSettings((text, params) => input.run(text, params ?? []), input.actor);

  const sql = toSql((text, params) => enqueue(() => input.run(text, params)));
  const serviceSql = toSql(<T>(text: string, params: unknown[]) =>
    enqueue(async () => {
      await input.exec("SAVEPOINT tb_service");
      try {
        await input.exec("RESET ROLE");
        const rows = await input.run<T>(text, params);
        await restore();
        await input.exec("RELEASE SAVEPOINT tb_service");
        return rows;
      } catch (error) {
        try {
          await input.exec("ROLLBACK TO SAVEPOINT tb_service");
        } catch {
          // Transaction is already aborted.
        }
        throw error;
      }
    }),
  );
  return { sql, serviceSql, actor: input.actor };
}

/**
 * Run ordinary application work as `titlebridge_app` with per-request GUCs.
 * Nested calls reuse the same transaction. Fail-closed: SET ROLE is required.
 */
export async function withRlsContext<T>(
  actor: RlsContext,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = rlsAls.getStore();
  if (existing) {
    if (existing.actor.userId !== actor.userId || existing.actor.role !== actor.role) {
      throw new Error("Cannot nest mismatched RLS actor contexts");
    }
    return fn();
  }

  await getPrivilegedSql();

  if (dbSource === "neon") {
    const pool = globalRef.__pgPool__;
    if (!pool) throw new Error("Neon pool is not initialized");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await applyRlsSettings(
        (text, params) => client.query(text, params),
        actor,
      );
      const store = createScopedSql({
        actor,
        exec: (text) => client.query(text),
        run: async <TRow>(text: string, params: unknown[]) => {
          const res = await client.query(text, params);
          return res.rows as TRow[];
        },
      });
      const result = await rlsAls.run(store, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep the original error if rollback fails.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg.transaction(async (tx) => {
    await applyRlsSettings(
      (text, params) => tx.query(text, params ?? []),
      actor,
    );
    const store = createScopedSql({
      actor,
      exec: (text) => tx.exec(text),
      run: async <TRow>(text: string, params: unknown[]) => {
        const result = await tx.query<TRow>(text, params);
        return result.rows;
      },
    });
    return rlsAls.run(store, fn);
  });
}

/**
 * The shared PGLite instance (preview only), with `migrations/*.sql` applied.
 * Lets Better Auth persist to the SAME embedded DB as app data in preview (via a
 * Kysely dialect). Throws when `DATABASE_URL` is set (that path uses Neon).
 */
export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") {
    throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
  }
  await getPrivilegedSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Finish DB bootstrap before the server handles traffic.
 *
 * - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
 *   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
 * - **Neon**: no-op (pool is created lazily on first query).
 *
 * Vite `configureServer` awaits this at dev startup; production imports of this
 * module kick it off immediately (see bottom of file).
 */
export function ensureDbReady(): Promise<void> {
  assertHostedProductionConfig({ databaseUrl });
  if (dbSource !== "pglite") return Promise.resolve();
  return getPrivilegedSql().then(() => undefined);
}

// Server-only eager start: kick PGLite bootstrap as soon as this module loads in
// Node. Client bundles never hit this path (`getSql` throws in the browser).
const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && dbSource === "pglite") {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
    throw err;
  });
}
