import { TITLE_SUBMIT_NOTICE } from "@/lib/constants";
import { getSql } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { can, canAccessCase, canAccessOwned, canSeeInternalNote, nextCaseStatusForReview } from "@/lib/rbac";
import type {
  CaseStatus,
  ReviewAction,
  TitleCaseRecord,
  TitleCaseReview,
  TitleStep,
  TitleTransactionType,
} from "@/lib/types";
import {
  createTitleCaseSchema,
  parseOrThrow,
  reviewActionSchema,
  titleInfoSchema,
} from "@/lib/validation";
import { assertPermission, type Actor } from "./actor";
import { writeAudit } from "./audit";
import { newId } from "./ids";
import { mapAudit } from "./mappers";
import { assertVehicleAccess, mapDocument, mapLien, mapOdometer, mapOwnership, nextCaseNumber } from "./vehicles";

const TRANSACTION_TO_CASE: Record<TitleTransactionType, TitleTransactionType | "title"> = {
  title_transfer: "title_transfer",
  duplicate_title: "duplicate_title",
  correction: "correction",
  lien_release: "lien_release",
  ownership_change: "ownership_change",
  private_party_sale: "private_party_sale",
  dealer_sale: "dealer_sale",
  other: "other",
};

const SECTION_TO_STEP: Record<string, TitleStep> = {
  ownership: "ownership",
  title: "title",
  lien: "lien",
  documents: "documents",
  case: "review",
};

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function dateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function mapTitleCase(row: Record<string, unknown>): TitleCaseRecord {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    caseNumber: String(row.case_number),
    vehicleId: String(row.vehicle_id),
    customerId: String(row.customer_id),
    transactionType: row.transaction_type as TitleTransactionType,
    currentStep: row.current_step as TitleStep,
    status: row.status as CaseStatus,
    titleState: row.title_state == null ? null : String(row.title_state),
    titleNumberLast4: row.title_number_last4 == null ? null : String(row.title_number_last4),
    titleIssueDate: dateOnly(row.title_issue_date),
    titleNotes: row.title_notes == null ? null : String(row.title_notes),
    assignedTo: row.assigned_to == null ? null : String(row.assigned_to),
    submittedAt: toIso(row.submitted_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapReview(row: Record<string, unknown>): TitleCaseReview {
  return {
    id: String(row.id),
    titleCaseId: String(row.title_case_id),
    section: row.section as TitleCaseReview["section"],
    action: row.action as ReviewAction,
    note: row.note == null ? null : String(row.note),
    actorUserId: String(row.actor_user_id),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

const TITLE_CASE_SELECT = `
  select t.*, c.case_number, c.status, c.assigned_to, c.jurisdiction
  from title_cases t
  join cases c on c.id = t.case_id
`;

export async function listOwnTitleCases(actor: Actor): Promise<TitleCaseRecord[]> {
  const sql = await getSql();
  const rows = await sql.query(
    `${TITLE_CASE_SELECT} where t.customer_id = $1 order by t.created_at desc`,
    [actor.userId],
  );
  return rows.map(mapTitleCase);
}

export async function adminListTitleCases(actor: Actor) {
  assertPermission(actor, "case:read:any");
  const sql = await getSql();
  const rows = await sql.query(
    `select t.*, c.case_number, c.status, c.assigned_to, c.jurisdiction,
            p.first_name, p.last_name, p.state,
            a.first_name as assignee_first, a.last_name as assignee_last
     from title_cases t
     join cases c on c.id = t.case_id
     left join profiles p on p.user_id = t.customer_id
     left join profiles a on a.user_id = c.assigned_to
     order by t.created_at desc limit 200`,
  );
  return rows.map((row) => ({
    ...mapTitleCase(row),
    customerName: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Customer",
    customerState: row.state == null ? null : String(row.state),
    assigneeName:
      `${row.assignee_first ?? ""} ${row.assignee_last ?? ""}`.trim() || null,
  }));
}

export async function getAccessibleTitleCase(actor: Actor, titleCaseId: string) {
  const sql = await getSql();
  const rows = await sql.query(`${TITLE_CASE_SELECT} where t.id = $1`, [titleCaseId]);
  const row = rows[0];
  if (!row) throw new NotFoundError("Title case not found");
  const record = mapTitleCase(row);
  if (
    !canAccessCase({
      actorId: actor.userId,
      actorRoles: actor.roles,
      customerId: record.customerId,
    })
  ) {
    throw new ForbiddenError();
  }
  const staff = can(actor.roles, "case:read:any");
  const [ownership, liens, documents, reviews, notes, odometer] = await Promise.all([
    sql.query(
      "select * from vehicle_ownership where vehicle_id = $1 order by created_at desc",
      [record.vehicleId],
    ),
    sql.query(
      "select * from vehicle_liens where vehicle_id = $1 or title_case_id = $2 order by created_at desc",
      [record.vehicleId, titleCaseId],
    ),
    sql.query(
      "select * from documents where title_case_id = $1 or (vehicle_id = $2 and owner_user_id = $3) order by created_at desc",
      [titleCaseId, record.vehicleId, record.customerId],
    ),
    sql.query(
      "select * from title_case_reviews where title_case_id = $1 order by created_at desc",
      [titleCaseId],
    ),
    sql.query(
      "select * from case_notes where case_id = $1 order by created_at asc",
      [record.caseId],
    ),
    sql.query(
      "select * from odometer_records where vehicle_id = $1 order by created_at desc",
      [record.vehicleId],
    ),
  ]);
  const mappedReviews = reviews.map(mapReview);
  const mappedNotes = notes.map((note) => ({
    id: String(note.id),
    caseId: String(note.case_id),
    authorId: String(note.author_id),
    note: String(note.note),
    visibility: note.visibility === "customer" ? ("customer" as const) : ("internal" as const),
    createdAt: toIso(note.created_at) ?? "",
  }));

  let audit: ReturnType<typeof mapAudit>[] = [];
  let customer: {
    userId: string;
    firstName: string;
    lastName: string;
    state: string | null;
  } | null = null;
  let assigneeName: string | null = null;
  if (staff) {
    const [auditRows, profileRows, assigneeRows] = await Promise.all([
      sql.query(
        `select * from audit_logs
         where resource_id = $1 or resource_id = $2 or resource_id = $3
         order by timestamp desc limit 80`,
        [record.id, record.caseId, record.vehicleId],
      ),
      sql.query(
        "select user_id, first_name, last_name, state from profiles where user_id = $1",
        [record.customerId],
      ),
      record.assignedTo
        ? sql.query(
            "select first_name, last_name from profiles where user_id = $1",
            [record.assignedTo],
          )
        : Promise.resolve([]),
    ]);
    audit = auditRows.map(mapAudit);
    const profile = profileRows[0];
    customer = {
      userId: record.customerId,
      firstName: profile ? String(profile.first_name ?? "") : "",
      lastName: profile ? String(profile.last_name ?? "") : "",
      state: profile?.state == null ? null : String(profile.state),
    };
    const assignee = assigneeRows[0];
    if (assignee) {
      assigneeName = `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim() || null;
    }
  }

  return {
    titleCase: record,
    ownership: ownership.map(mapOwnership),
    liens: liens.map(mapLien),
    documents: documents.map(mapDocument),
    odometer: odometer.map(mapOdometer),
    reviews: staff
      ? mappedReviews
      : mappedReviews.filter((item) => item.action === "info_requested" || item.action === "rejected"),
    notes: mappedNotes.filter(
      (note) => note.visibility === "customer" || canSeeInternalNote(actor.roles),
    ),
    audit,
    customer,
    assigneeName,
    submitNotice: TITLE_SUBMIT_NOTICE,
  };
}

export async function createTitleCase(actor: Actor, input: unknown) {
  assertPermission(actor, "case:create:own");
  const data = parseOrThrow(createTitleCaseSchema, input);
  const vehicle = await assertVehicleAccess(actor, data.vehicleId);
  if (String(vehicle.owner_user_id) !== actor.userId) throw new ForbiddenError();
  const sql = await getSql();
  const caseId = newId("cse");
  const titleId = newId("ttl");
  const caseNumber = await nextCaseNumber();
  const caseType = TRANSACTION_TO_CASE[data.transactionType];
  await sql.query(
    `insert into cases (id, case_number, customer_id, case_type, status, jurisdiction)
     values ($1,$2,$3,$4,'draft',$5)`,
    [caseId, caseNumber, actor.userId, caseType, data.jurisdiction ?? null],
  );
  await sql.query(
    `insert into title_cases (
      id, case_id, vehicle_id, customer_id, transaction_type, current_step
    ) values ($1,$2,$3,$4,$5,'ownership')`,
    [titleId, caseId, data.vehicleId, actor.userId, data.transactionType],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "title_case.created",
    resourceType: "title_case",
    resourceId: titleId,
    metadata: { caseNumber, transactionType: data.transactionType },
  });
  return (await getAccessibleTitleCase(actor, titleId)).titleCase;
}

export async function saveTitleInfo(actor: Actor, input: unknown) {
  const data = parseOrThrow(titleInfoSchema, input);
  const current = await getAccessibleTitleCase(actor, data.titleCaseId);
  if (current.titleCase.customerId !== actor.userId) throw new ForbiddenError();
  if (current.titleCase.status !== "draft" && current.titleCase.status !== "awaiting_customer") {
    throw new AppError("This title case can no longer be edited", { status: 400 });
  }
  const sql = await getSql();
  await sql.query(
    `update title_cases
     set title_state = $2,
         title_number_last4 = $3,
         title_issue_date = $4,
         title_notes = $5,
         current_step = case when current_step in ('vehicle','ownership','title') then 'lien' else current_step end,
         updated_at = now()
     where id = $1`,
    [
      data.titleCaseId,
      data.titleState,
      data.titleNumberLast4 ? data.titleNumberLast4.slice(-4) : null,
      data.titleIssueDate ? data.titleIssueDate : null,
      data.titleNotes ? data.titleNotes : null,
    ],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "title_case.title_updated",
    resourceType: "title_case",
    resourceId: data.titleCaseId,
    metadata: { titleState: data.titleState },
  });
  return (await getAccessibleTitleCase(actor, data.titleCaseId)).titleCase;
}

export async function advanceTitleCase(actor: Actor, titleCaseId: string, step: TitleStep) {
  const current = await getAccessibleTitleCase(actor, titleCaseId);
  if (current.titleCase.customerId !== actor.userId) throw new ForbiddenError();
  if (
    current.titleCase.status !== "draft" &&
    current.titleCase.status !== "awaiting_customer"
  ) {
    throw new AppError("This title case can no longer be edited", { status: 400 });
  }
  const sql = await getSql();
  await sql.query(
    "update title_cases set current_step = $2, updated_at = now() where id = $1",
    [titleCaseId, step],
  );
  return (await getAccessibleTitleCase(actor, titleCaseId)).titleCase;
}

export async function submitTitleCase(actor: Actor, titleCaseId: string) {
  const current = await getAccessibleTitleCase(actor, titleCaseId);
  if (current.titleCase.customerId !== actor.userId) throw new ForbiddenError();
  if (
    current.titleCase.currentStep === "submitted" &&
    current.titleCase.status !== "awaiting_customer"
  ) {
    throw new AppError("This title case is already submitted for internal review", { status: 400 });
  }
  if (current.ownership.length === 0) {
    throw new AppError("Add ownership information before submitting", { status: 400 });
  }
  if (!current.titleCase.titleState) {
    throw new AppError("Add title information before submitting", { status: 400 });
  }
  if (current.liens.length === 0) {
    throw new AppError("Record lien information before submitting", { status: 400 });
  }
  const sql = await getSql();
  await sql.query(
    `update title_cases
     set current_step = 'submitted', submitted_at = now(), updated_at = now()
     where id = $1`,
    [titleCaseId],
  );
  await sql.query(
    "update cases set status = 'under_review', updated_at = now() where id = $1",
    [current.titleCase.caseId],
  );
  await sql.query(
    `insert into notifications (id, user_id, type, title, message)
     values ($1,$2,'title_case','Submitted for internal review',$3)`,
    [
      newId("ntf"),
      actor.userId,
      `Case ${current.titleCase.caseNumber} was submitted to TitleBridge internal review. It was not filed with a motor-vehicle department.`,
    ],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "title_case.submitted",
    resourceType: "title_case",
    resourceId: titleCaseId,
    metadata: { destination: "internal_review_only" },
  });
  return (await getAccessibleTitleCase(actor, titleCaseId)).titleCase;
}

export async function reviewTitleCase(actor: Actor, input: unknown) {
  assertPermission(actor, "review:act");
  const data = parseOrThrow(reviewActionSchema, input);
  if (data.action === "flagged") {
    assertPermission(actor, "compliance:review");
  }
  const current = await getAccessibleTitleCase(actor, data.titleCaseId);
  const sql = await getSql();
  const id = newId("rev");
  await sql.query(
    `insert into title_case_reviews (
      id, title_case_id, section, action, note, actor_user_id
    ) values ($1,$2,$3,$4,$5,$6)`,
    [id, data.titleCaseId, data.section, data.action, data.note ? data.note : null, actor.userId],
  );

  if (data.action === "info_requested") {
    const nextStep = SECTION_TO_STEP[data.section] ?? "review";
    const nextStatus = nextCaseStatusForReview({
      actorRoles: actor.roles,
      action: data.action,
      section: data.section,
      currentStatus: current.titleCase.status,
    });
    if (nextStatus) {
      await sql.query(
        "update cases set status = $2, updated_at = now() where id = $1",
        [current.titleCase.caseId, nextStatus],
      );
    }
    await sql.query(
      "update title_cases set current_step = $2, updated_at = now() where id = $1",
      [data.titleCaseId, nextStep],
    );
    await sql.query(
      `insert into notifications (id, user_id, type, title, message)
       values ($1,$2,'info_requested','More information requested',$3)`,
      [
        newId("ntf"),
        current.titleCase.customerId,
        data.note || "TitleBridge operations requested more information on your case.",
      ],
    );
  } else if (data.action === "rejected") {
    const nextStatus = nextCaseStatusForReview({
      actorRoles: actor.roles,
      action: data.action,
      section: data.section,
      currentStatus: current.titleCase.status,
    });
    if (nextStatus) {
      await sql.query(
        "update cases set status = $2, updated_at = now() where id = $1",
        [current.titleCase.caseId, nextStatus],
      );
    }
  } else if (data.action === "flagged") {
    await sql.query(
      `insert into risk_flags (id, user_id, case_id, flag_type, severity, note)
       values ($1,$2,$3,'compliance_review','medium',$4)`,
      [newId("flg"), current.titleCase.customerId, current.titleCase.caseId, data.note ?? "Flagged for compliance"],
    );
    await sql.query(
      `insert into compliance_events (id, user_id, event_type, summary)
       values ($1,$2,'case_flagged',$3)`,
      [newId("cmp"), current.titleCase.customerId, `Title case ${current.titleCase.caseNumber} flagged`],
    );
  } else if (data.action === "assigned" || data.action === "reassigned") {
    assertPermission(actor, "case:assign");
    const assignee = data.assigneeUserId?.trim() || actor.userId;
    const previous = current.titleCase.assignedTo;
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
    await sql.query(
      "update cases set assigned_to = $2, status = 'under_review', updated_at = now() where id = $1",
      [current.titleCase.caseId, assignee],
    );
    await writeAudit({
      actorUserId: actor.userId,
      actorRole: actor.primaryRole,
      action: previous && previous !== assignee ? "title_case.reassigned" : "title_case.assigned",
      resourceType: "title_case",
      resourceId: data.titleCaseId,
      metadata: {
        section: data.section,
        reviewAction: data.action,
        assigneeUserId: assignee,
        previousAssignee: previous,
      },
    });
    return getAccessibleTitleCase(actor, data.titleCaseId);
  } else if (data.action === "approved") {
    const nextStatus = nextCaseStatusForReview({
      actorRoles: actor.roles,
      action: data.action,
      section: data.section,
      currentStatus: current.titleCase.status,
    });
    if (nextStatus) {
      await sql.query(
        "update cases set status = $2, updated_at = now() where id = $1",
        [current.titleCase.caseId, nextStatus],
      );
    }
  }

  const auditAction =
    data.action === "info_requested"
      ? "title_case.info_requested"
      : data.action === "flagged"
        ? "title_case.flagged"
        : "title_case.reviewed";
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: auditAction,
    resourceType: "title_case",
    resourceId: data.titleCaseId,
    metadata: { section: data.section, reviewAction: data.action },
  });
  return getAccessibleTitleCase(actor, data.titleCaseId);
}

export async function assertOwnedDocumentAccess(
  actor: Actor,
  ownerUserId: string,
) {
  if (
    !canAccessOwned({
      actorId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId,
      staffPermission: "document:read:any",
    })
  ) {
    throw new ForbiddenError();
  }
}
