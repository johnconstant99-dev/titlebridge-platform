import { formatCaseNumber } from "@/lib/case-number";
import {
  CONSENT_ELECTRONIC_VERSION,
  CONSENT_PRIVACY_VERSION,
  CONSENT_TERMS_VERSION,
} from "@/lib/constants";
import { getServiceSql, getSql } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  allowedStatusChange,
  canAccessCase,
  canSeeInternalNote,
  validateRoleAssignment,
} from "@/lib/rbac";
import type { CaseStatus, CaseType } from "@/lib/types";
import {
  createCaseSchema,
  caseNoteSchema,
  caseStatusSchema,
  onboardingSchema,
  organizationCreateSchema,
  parseOrThrow,
  profileUpdateSchema,
  roleAssignSchema,
  assignCaseSchema,
} from "@/lib/validation";
import { catalogEntries } from "@/integrations/registry";
import { minimizeIp, truncateUserAgent } from "@/security/sanitize";
import { assertPermission, loadRoles, type Actor } from "./actor";
import { writeAudit } from "./audit";
import { developmentDataEnabled } from "./bootstrap";
import { newId } from "./ids";
import {
  mapAudit,
  mapCase,
  mapNote,
  mapNotification,
  mapOrg,
  mapProfile,
  mapProvider,
  mapRoles,
  mapState,
} from "./mappers";

function asRoleList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function completeOnboarding(
  actor: Actor,
  input: unknown,
  requestMeta: { ip?: string | null; userAgent?: string | null },
) {
  const data = parseOrThrow(onboardingSchema, input);
  const sql = await getSql();
  await sql.query(
    `update profiles
     set first_name = $2,
         last_name = $3,
         phone = $4,
         state = $5,
         notification_preference = $6,
         onboarding_completed = true,
         updated_at = now()
     where user_id = $1`,
    [
      actor.userId,
      data.firstName,
      data.lastName,
      data.phone ? data.phone : null,
      data.state,
      data.notificationPreference,
    ],
  );

  const consents = [
    { type: "terms_of_use", version: CONSENT_TERMS_VERSION },
    { type: "privacy_notice", version: CONSENT_PRIVACY_VERSION },
    { type: "electronic_records", version: CONSENT_ELECTRONIC_VERSION },
  ];
  for (const consent of consents) {
    await sql.query(
      `insert into consent_records (
        id, user_id, consent_type, consent_version, accepted, accepted_at,
        ip_metadata, user_agent_metadata
      ) values ($1,$2,$3,$4,true,now(),$5,$6)`,
      [
        newId("cns"),
        actor.userId,
        consent.type,
        consent.version,
        minimizeIp(requestMeta.ip),
        truncateUserAgent(requestMeta.userAgent),
      ],
    );
  }

  await sql.query(
    `insert into notifications (id, user_id, type, title, message)
     values ($1,$2,'welcome','Welcome to TitleBridge','Your account foundation is ready. Identity verification and vehicle transactions arrive in a later phase.')`,
    [newId("ntf"), actor.userId],
  );

  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "onboarding.completed",
    resourceType: "profile",
    resourceId: actor.userId,
    metadata: { state: data.state },
  });

  const rows = await sql.query("select * from profiles where user_id = $1", [actor.userId]);
  return mapProfile(rows[0]!);
}

export async function updateProfile(actor: Actor, input: unknown) {
  const data = parseOrThrow(profileUpdateSchema, input);
  const sql = await getSql();
  await sql.query(
    `update profiles
     set first_name = $2, last_name = $3, phone = $4, state = $5,
         notification_preference = $6, updated_at = now()
     where user_id = $1`,
    [
      actor.userId,
      data.firstName,
      data.lastName,
      data.phone ? data.phone : null,
      data.state,
      data.notificationPreference,
    ],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "profile.updated",
    resourceType: "profile",
    resourceId: actor.userId,
  });
  const rows = await sql.query("select * from profiles where user_id = $1", [actor.userId]);
  return mapProfile(rows[0]!);
}

export async function listOwnCases(actor: Actor) {
  const sql = await getSql();
  const rows = await sql.query(
    "select * from cases where customer_id = $1 order by created_at desc",
    [actor.userId],
  );
  return rows.map(mapCase);
}

export async function getAccessibleCase(actor: Actor, caseId: string) {
  const sql = await getSql();
  const rows = await sql.query("select * from cases where id = $1", [caseId]);
  const record = rows[0];
  if (!record) throw new NotFoundError("Case not found");
  const mapped = mapCase(record);
  if (
    !canAccessCase({
      actorId: actor.userId,
      actorRoles: actor.roles,
      customerId: mapped.customerId,
    })
  ) {
    throw new ForbiddenError();
  }
  const noteRows = await sql.query(
    "select * from case_notes where case_id = $1 order by created_at asc",
    [caseId],
  );
  const notes = noteRows
    .map(mapNote)
    .filter((note) => note.visibility === "customer" || canSeeInternalNote(actor.roles));
  return { case: mapped, notes };
}

export async function createDraftCase(actor: Actor, input: unknown) {
  assertPermission(actor, "case:create:own");
  const data = parseOrThrow(createCaseSchema, input);
  const sql = await getSql();
  const seqRows = await sql.query<{ n: number }>(
    "select nextval('case_number_seq')::int as n",
  );
  const sequence = seqRows[0]?.n ?? 1;
  const caseNumber = formatCaseNumber(new Date().getUTCFullYear(), sequence);
  const id = newId("cse");
  await sql.query(
    `insert into cases (
      id, case_number, customer_id, case_type, status, jurisdiction
    ) values ($1,$2,$3,$4,'draft',$5)`,
    [id, caseNumber, actor.userId, data.caseType, data.jurisdiction ?? null],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "case.created",
    resourceType: "case",
    resourceId: id,
    metadata: { caseNumber, caseType: data.caseType },
  });
  return (await getAccessibleCase(actor, id)).case;
}

export async function addCaseNote(actor: Actor, input: unknown) {
  const data = parseOrThrow(caseNoteSchema, input);
  const { case: record } = await getAccessibleCase(actor, data.caseId);
  if (data.visibility === "internal") {
    assertPermission(actor, "case:note:internal");
  } else if (!canAccessCase({
    actorId: actor.userId,
    actorRoles: actor.roles,
    customerId: record.customerId,
  })) {
    throw new ForbiddenError();
  }
  if (data.visibility === "customer" && record.customerId !== actor.userId) {
    assertPermission(actor, "case:note:customer");
  }
  const sql = await getSql();
  const id = newId("nte");
  await sql.query(
    `insert into case_notes (id, case_id, author_id, note, visibility)
     values ($1,$2,$3,$4,$5)`,
    [id, data.caseId, actor.userId, data.note, data.visibility],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "case.note_added",
    resourceType: "case",
    resourceId: data.caseId,
    metadata: { visibility: data.visibility },
  });
  return { id };
}

export async function updateCaseStatus(actor: Actor, input: unknown) {
  const data = parseOrThrow(caseStatusSchema, input);
  assertPermission(actor, "case:status:update");
  if (!allowedStatusChange(actor.roles, data.status as CaseStatus)) {
    throw new ForbiddenError("Status change is not permitted for this role");
  }
  const { case: record } = await getAccessibleCase(actor, data.caseId);
  const sql = await getSql();
  await sql.query(
    "update cases set status = $2, updated_at = now() where id = $1",
    [data.caseId, data.status],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "case.status_changed",
    resourceType: "case",
    resourceId: data.caseId,
    metadata: { from: record.status, to: data.status },
  });
  return (await getAccessibleCase(actor, data.caseId)).case;
}

export async function listNotifications(actor: Actor) {
  const sql = await getSql();
  const rows = await sql.query(
    "select * from notifications where user_id = $1 order by created_at desc limit 50",
    [actor.userId],
  );
  return rows.map(mapNotification);
}

export async function markNotificationRead(actor: Actor, id: string) {
  const sql = await getSql();
  await sql.query(
    "update notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null",
    [id, actor.userId],
  );
  return { ok: true };
}

export async function listOwnVehicles(actor: Actor) {
  const { listOwnVehicles: list } = await import("./vehicles");
  return list(actor);
}

export async function listOwnDocuments(actor: Actor) {
  const { listOwnDocuments: list } = await import("./vehicles");
  return list(actor);
}

export async function listConsents(actor: Actor) {
  const sql = await getSql();
  const rows = await sql.query(
    `select id, consent_type, consent_version, accepted, accepted_at, created_at
     from consent_records where user_id = $1 order by created_at desc`,
    [actor.userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    consentType: String(row.consent_type),
    consentVersion: String(row.consent_version),
    accepted: Boolean(row.accepted),
    acceptedAt: row.accepted_at == null ? null : String(row.accepted_at),
    createdAt: String(row.created_at),
  }));
}

export async function recordAuthEvent(actor: Actor, action: "login" | "logout") {
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: `auth.${action}`,
    resourceType: "session",
    resourceId: actor.userId,
  });
}

export async function adminOverview(actor: Actor) {
  assertPermission(actor, "internal:access");
  const sql = await getSql();
  const [users, openCases, orgs, events, pending, vehicles] = await Promise.all([
    sql.query<{ count: number }>("select count(*)::int as count from profiles"),
    sql.query<{ count: number }>(
      "select count(*)::int as count from cases where status not in ('completed','cancelled','rejected')",
    ),
    sql.query<{ count: number }>("select count(*)::int as count from organizations"),
    sql.query<{ count: number }>(
      "select count(*)::int as count from audit_logs where timestamp > now() - interval '24 hours'",
    ),
    sql.query<{ count: number }>(
      "select count(*)::int as count from cases where status in ('under_review','verification_required','documents_required','awaiting_customer')",
    ),
    sql.query<{ count: number }>(
      "select count(*)::int as count from vehicles where status <> 'placeholder'",
    ),
  ]);
  return {
    totalUsers: users[0]?.count ?? 0,
    openCases: openCases[0]?.count ?? 0,
    organizations: orgs[0]?.count ?? 0,
    systemEvents24h: events[0]?.count ?? 0,
    pendingReviews: pending[0]?.count ?? 0,
    vehicles: vehicles[0]?.count ?? 0,
    developmentData: developmentDataEnabled(),
  };
}

export async function adminListUsers(actor: Actor) {
  assertPermission(actor, "user:manage");
  const sql = await getSql();
  const rows = await sql.query(
    `select p.user_id, p.first_name, p.last_name, p.state, p.onboarding_completed, p.created_at,
            coalesce((
              select json_agg(r.role) from user_roles r where r.user_id = p.user_id
            ), '[]'::json) as roles
     from profiles p
     order by p.created_at desc
     limit 200`,
  );
  return rows.map((row) => ({
    userId: String(row.user_id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    state: row.state == null ? null : String(row.state),
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: String(row.created_at),
    roles: Array.isArray(row.roles) ? (row.roles as string[]) : [],
  }));
}

export async function adminAssignRole(actor: Actor, input: unknown) {
  const data = parseOrThrow(roleAssignSchema, input);
  const check = validateRoleAssignment(actor.roles, data.role);
  if (!check.ok) throw new ForbiddenError(check.reason);
  if (data.userId === actor.userId && data.role === "ADMIN" && actor.primaryRole !== "SUPER_ADMIN") {
    throw new ForbiddenError("Administrators cannot alter their own privileged role here");
  }
  const sql = await getSql();
  const exists = await sql.query("select id from profiles where user_id = $1", [data.userId]);
  if (exists.length === 0) throw new NotFoundError("User not found");
  await sql.query(
    `insert into user_roles (id, user_id, role, assigned_by)
     values ($1,$2,$3,$4)
     on conflict (user_id, role) do nothing`,
    [newId("rol"), data.userId, data.role, actor.userId],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "role.assigned",
    resourceType: "user_role",
    resourceId: data.userId,
    metadata: { role: data.role },
  });
  return { ok: true, roles: await loadRoles(data.userId) };
}

export async function adminRemoveRole(actor: Actor, input: unknown) {
  const data = parseOrThrow(roleAssignSchema, input);
  const check = validateRoleAssignment(actor.roles, data.role);
  if (!check.ok) throw new ForbiddenError(check.reason);
  if (data.role === "CUSTOMER") {
    throw new AppError("The CUSTOMER role cannot be removed", { status: 400 });
  }
  const sql = await getSql();
  await sql.query(
    "delete from user_roles where user_id = $1 and role = $2 and role <> 'SUPER_ADMIN'",
    [data.userId, data.role],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "role.removed",
    resourceType: "user_role",
    resourceId: data.userId,
    metadata: { role: data.role },
  });
  return { ok: true };
}

export async function adminListCases(actor: Actor) {
  assertPermission(actor, "case:read:any");
  const sql = await getSql();
  const rows = await sql.query(
    `select c.*, t.id as title_case_id
     from cases c
     left join title_cases t on t.case_id = c.id
     order by c.created_at desc
     limit 200`,
  );
  return rows.map((row) => ({
    ...mapCase(row),
    titleCaseId: row.title_case_id == null ? null : String(row.title_case_id),
  }));
}

export async function listAssignableStaff(actor: Actor) {
  assertPermission(actor, "case:assign");
  const sql = await getSql();
  const rows = await sql.query(
    `select p.user_id, p.first_name, p.last_name,
            coalesce((
              select json_agg(r.role) from user_roles r where r.user_id = p.user_id
            ), '[]'::json) as roles
     from profiles p
     where exists (
       select 1 from user_roles r
       where r.user_id = p.user_id
         and r.role in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')
     )
     order by p.last_name, p.first_name
     limit 200`,
  );
  return rows.map((row) => ({
    userId: String(row.user_id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    roles: asRoleList(row.roles),
  }));
}

export async function assignCase(actor: Actor, input: unknown) {
  assertPermission(actor, "case:assign");
  const data = parseOrThrow(assignCaseSchema, input);
  const { case: record } = await getAccessibleCase(actor, data.caseId);
  const assignee = data.assigneeUserId?.trim() || actor.userId;
  const sql = await getSql();
  const roleRows = await sql.query<{ role: string }>(
    "select role from user_roles where user_id = $1",
    [assignee],
  );
  const staff = roleRows.some((row) =>
    ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"].includes(row.role),
  );
  if (!staff) {
    throw new AppError("Assignee must be an internal staff user", { status: 400 });
  }
  const previous = record.assignedTo;
  const action = previous && previous !== assignee ? "reassigned" : "assigned";
  await sql.query(
    `update cases
     set assigned_to = $2,
         status = case when status = 'draft' then 'under_review' else status end,
         updated_at = now()
     where id = $1`,
    [data.caseId, assignee],
  );
  const titleRows = await sql.query<{ id: string }>(
    "select id from title_cases where case_id = $1",
    [data.caseId],
  );
  if (titleRows[0]) {
    await sql.query(
      `insert into title_case_reviews (
        id, title_case_id, section, action, note, actor_user_id
      ) values ($1,$2,'case',$3,$4,$5)`,
      [newId("rev"), titleRows[0].id, action, null, actor.userId],
    );
  }
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: action === "reassigned" ? "case.reassigned" : "case.assigned",
    resourceType: "case",
    resourceId: data.caseId,
    metadata: {
      assigneeUserId: assignee,
      previousAssignee: previous,
    },
  });
  return (await getAccessibleCase(actor, data.caseId)).case;
}

export async function adminListOrganizations(actor: Actor) {
  assertPermission(actor, "org:read");
  const sql = await getSql();
  const rows = await sql.query("select * from organizations order by created_at desc");
  return rows.map(mapOrg);
}

export async function adminCreateOrganization(actor: Actor, input: unknown) {
  assertPermission(actor, "org:manage");
  const data = parseOrThrow(organizationCreateSchema, input);
  const sql = await getSql();
  const id = newId("org");
  await sql.query(
    `insert into organizations (id, organization_name, organization_type, status, is_development_data)
     values ($1,$2,$3,'pending', false)`,
    [id, data.organizationName, data.organizationType],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "organization.created",
    resourceType: "organization",
    resourceId: id,
  });
  const rows = await sql.query("select * from organizations where id = $1", [id]);
  return mapOrg(rows[0]!);
}

export async function adminListAudit(actor: Actor) {
  assertPermission(actor, "audit:read");
  const sql = await getSql();
  const rows = await sql.query(
    "select * from audit_logs order by timestamp desc limit 200",
  );
  return rows.map(mapAudit);
}

export async function adminCompliance(actor: Actor) {
  assertPermission(actor, "compliance:review");
  const sql = await getSql();
  const [idv, flags, events, consents] = await Promise.all([
    sql.query("select * from identity_verification_records order by created_at desc limit 50"),
    sql.query("select * from risk_flags order by created_at desc limit 50"),
    sql.query("select * from compliance_events order by created_at desc limit 50"),
    sql.query(
      `select id, user_id, consent_type, consent_version, accepted, accepted_at, created_at
       from consent_records order by created_at desc limit 50`,
    ),
  ]);
  return {
    identityRecords: idv.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      provider: String(row.provider),
      status: String(row.status),
      createdAt: String(row.created_at),
    })),
    riskFlags: flags.map((row) => ({
      id: String(row.id),
      userId: row.user_id == null ? null : String(row.user_id),
      flagType: String(row.flag_type),
      severity: String(row.severity),
      status: String(row.status),
      createdAt: String(row.created_at),
    })),
    events: events.map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      summary: String(row.summary),
      createdAt: String(row.created_at),
    })),
    consents: consents.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      consentType: String(row.consent_type),
      consentVersion: String(row.consent_version),
      accepted: Boolean(row.accepted),
      acceptedAt: row.accepted_at == null ? null : String(row.accepted_at),
    })),
  };
}

export async function listStates() {
  const sql = await getServiceSql();
  const rows = await sql.query("select * from state_configurations order by state_code");
  return rows.map(mapState);
}

export async function listIntegrations(actor: Actor) {
  assertPermission(actor, "integrations:read");
  const sql = await getSql();
  const rows = await sql.query(
    "select * from integration_providers order by provider_type, environment",
  );
  return {
    providers: rows.map(mapProvider),
    catalog: catalogEntries(),
  };
}

export async function systemHealth(actor: Actor) {
  assertPermission(actor, "system:health");
  const sql = await getSql();
  const ping = await sql.query<{ now: string }>("select now()::text as now");
  return {
    database: "ok",
    checkedAt: ping[0]?.now ?? new Date().toISOString(),
    developmentData: developmentDataEnabled(),
    integrations: catalogEntries().map((item) => ({
      type: item.providerType,
      status: "not_configured",
    })),
    emailDelivery: "not_configured",
    objectStorage: "not_configured",
  };
}

export async function platformSettings(actor: Actor) {
  assertPermission(actor, "settings:manage");
  const sql = await getSql();
  const rows = await sql.query("select key, value, updated_at from platform_settings");
  return rows.map((row) => ({
    key: String(row.key),
    value: JSON.stringify(row.value ?? null),
    updatedAt: String(row.updated_at),
  }));
}

export async function bootstrapSuperAdmin(actor: Actor) {
  if (!developmentDataEnabled()) {
    throw new ForbiddenError("Platform bootstrap is disabled outside development data mode");
  }
  const sql = await getServiceSql();
  const existing = await sql.query<{ count: number }>(
    "select count(*)::int as count from user_roles where role = 'SUPER_ADMIN'",
  );
  if ((existing[0]?.count ?? 0) > 0) {
    throw new ForbiddenError("A super administrator already exists");
  }
  await sql.query(
    `insert into user_roles (id, user_id, role, assigned_by)
     values ($1,$2,'SUPER_ADMIN',$3)
     on conflict (user_id, role) do nothing`,
    [newId("rol"), actor.userId, "bootstrap"],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: "SUPER_ADMIN",
    action: "role.bootstrap_super_admin",
    resourceType: "user_role",
    resourceId: actor.userId,
    metadata: { developmentData: true },
  });
  const roleRows = await sql.query<{ role: string }>(
    "select role from user_roles where user_id = $1",
    [actor.userId],
  );
  return { ok: true, roles: mapRoles(roleRows) };
}

export async function superAdminExists() {
  const sql = await getServiceSql();
  const rows = await sql.query<{ count: number }>(
    "select count(*)::int as count from user_roles where role = 'SUPER_ADMIN'",
  );
  return (rows[0]?.count ?? 0) > 0;
}

export type { Actor, CaseType };
