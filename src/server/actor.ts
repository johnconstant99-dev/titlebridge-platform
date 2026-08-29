import { getServiceSql, getSql, withRlsContext } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { can, isStaff, primaryRole, type Permission } from "@/lib/rbac";
import type { Role, SessionSnapshot } from "@/lib/types";
import { UnauthorizedError } from "@/lib/auth/verify.server";
import { mapProfile, mapRoles } from "./mappers";
import { newId } from "./ids";
import { ensureFoundationData, developmentDataEnabled } from "./bootstrap";
import { writeAudit } from "./audit";

export type Actor = {
  userId: string;
  email: string | null;
  roles: Role[];
  primaryRole: Role;
};

export async function loadRoles(userId: string): Promise<Role[]> {
  const sql = await getSql();
  const rows = await sql.query<{ role: string }>(
    "select role from user_roles where user_id = $1",
    [userId],
  );
  const roles = mapRoles(rows);
  if (roles.length === 0) return ["CUSTOMER"];
  return roles;
}

export async function ensureCustomerRole(userId: string, assignedBy?: string) {
  const sql = await getServiceSql();
  const existing = await sql.query<{ id: string }>(
    "select id from user_roles where user_id = $1 and role = 'CUSTOMER'",
    [userId],
  );
  if (existing.length === 0) {
    await sql.query(
      "insert into user_roles (id, user_id, role, assigned_by) values ($1,$2,'CUSTOMER',$3)",
      [newId("rol"), userId, assignedBy ?? "system"],
    );
  }
}

export async function ensureProfileRow(userId: string) {
  const sql = await getServiceSql();
  const existing = await sql.query("select id from profiles where user_id = $1", [userId]);
  if (existing.length === 0) {
    await sql.query(
      `insert into profiles (id, user_id, first_name, last_name)
       values ($1,$2,'','')`,
      [newId("pro"), userId],
    );
    await writeAudit({
      actorUserId: userId,
      actorRole: "CUSTOMER",
      action: "auth.signup",
      resourceType: "user",
      resourceId: userId,
    });
  }
}

export async function loadActor(userId: string, email?: string | null): Promise<Actor> {
  await ensureFoundationData();
  await ensureProfileRow(userId);
  await ensureCustomerRole(userId);
  const sql = await getServiceSql();
  const rows = await sql.query<{ role: string }>(
    "select role from user_roles where user_id = $1",
    [userId],
  );
  const roles = mapRoles(rows);
  const resolved = roles.length === 0 ? (["CUSTOMER"] as Role[]) : roles;
  return {
    userId,
    email: email ?? null,
    roles: resolved,
    primaryRole: primaryRole(resolved),
  };
}

/**
 * Privileged first-login / bootstrap, then ordinary work as titlebridge_app.
 * Ordinary customer queries must not use the service role.
 */
export async function runWithActor<T>(
  userId: string,
  fn: (actor: Actor) => Promise<T>,
  email?: string | null,
): Promise<T> {
  const actor = await loadActor(userId, email);
  return withRlsContext({ userId: actor.userId, role: actor.primaryRole }, () => fn(actor));
}

export function assertPermission(actor: Actor, permission: Permission) {
  if (!can(actor.roles, permission)) {
    throw new ForbiddenError();
  }
}

export function assertStaff(actor: Actor) {
  if (!isStaff(actor.roles)) throw new ForbiddenError();
}

export async function loadSessionSnapshot(
  actor: Actor,
  displayName: string | null,
): Promise<SessionSnapshot> {
  const sql = await getSql();
  const rows = await sql.query("select * from profiles where user_id = $1", [actor.userId]);
  const profile = rows[0] ? mapProfile(rows[0]) : null;
  return {
    userId: actor.userId,
    email: actor.email,
    displayName,
    roles: actor.roles,
    profile,
    developmentData: developmentDataEnabled(),
    canAccessInternal: isStaff(actor.roles),
  };
}

export function requireUserFromContext(userId: string | undefined): string {
  if (!userId) throw new UnauthorizedError();
  return userId;
}
