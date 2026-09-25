import { formatCaseNumber } from "@/lib/case-number";
import { VIN_FORMAT_VALIDATED } from "@/lib/constants";
import { getSql } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { decodeVin } from "@/integrations/vin";
import { canAccessOwned } from "@/lib/rbac";
import type {
  DocumentRecord,
  DocumentType,
  LienRecord,
  LienStatus,
  OdometerRecord,
  OwnershipRecord,
  OwnershipType,
  VehicleRecord,
} from "@/lib/types";
import {
  createVehicleSchema,
  lienSchema,
  ownershipSchema,
  parseOrThrow,
  staffLienSchema,
  uploadDocumentSchema,
} from "@/lib/validation";
import { maskVin, validateVin, vehicleDisplayName } from "@/lib/vin";
import { assertPermission, type Actor } from "./actor";
import { writeAudit } from "./audit";
import { newId } from "./ids";
import { putDocumentBlob, signDocumentAccess } from "./vault";
import { assertIdentityVerified } from "./identity";

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function dateOnly(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function mapVehicle(
  row: Record<string, unknown>,
  extras?: Partial<VehicleRecord>,
): VehicleRecord {
  const year = row.year == null ? null : Number(row.year);
  const make = row.make == null ? null : String(row.make);
  const model = row.model == null ? null : String(row.model);
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    displayName:
      row.display_name == null || String(row.display_name) === ""
        ? vehicleDisplayName({ year, make, model })
        : String(row.display_name),
    vinMasked: maskVin(row.vin_normalized == null ? null : String(row.vin_normalized)),
    year,
    make,
    model,
    trim: row.trim == null ? null : String(row.trim),
    color: row.color == null ? null : String(row.color),
    plateNumber: row.plate_number == null ? null : String(row.plate_number),
    plateState: row.plate_state == null ? null : String(row.plate_state),
    status: String(row.status ?? "active"),
    vinFormatValid: Boolean(row.vin_format_valid),
    vinChecksumValid: Boolean(row.vin_checksum_valid),
    verificationStatus:
      (row.verification_status as VehicleRecord["verificationStatus"]) ?? "unverified",
    providerMessage: row.provider_message == null ? null : String(row.provider_message),
    ownershipStatus: extras?.ownershipStatus ?? "none",
    lienStatus: extras?.lienStatus ?? "unknown",
    titleCaseStatus: extras?.titleCaseStatus ?? null,
    documentCount: extras?.documentCount ?? 0,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapOwnership(row: Record<string, unknown>): OwnershipRecord {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    ownerUserId: String(row.owner_user_id),
    ownershipType: row.ownership_type as OwnershipType,
    ownerName: String(row.owner_name),
    acquisitionDate: dateOnly(row.acquisition_date),
    purchasePrice: row.purchase_price == null ? null : String(row.purchase_price),
    sellerName: row.seller_name == null ? null : String(row.seller_name),
    verificationStatus: (row.verification_status as OwnershipRecord["verificationStatus"]) ?? "self_reported",
    createdAt: toIso(row.created_at),
  };
}

export function mapLien(row: Record<string, unknown>): LienRecord {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    ownerUserId: String(row.owner_user_id),
    titleCaseId: row.title_case_id == null ? null : String(row.title_case_id),
    status: row.status as LienStatus,
    lienholderName: row.lienholder_name == null ? null : String(row.lienholder_name),
    note: row.note == null ? null : String(row.note),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapOdometer(row: Record<string, unknown>): OdometerRecord {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    reading: Number(row.reading),
    unit: row.unit === "kilometers" ? "kilometers" : "miles",
    source: String(row.source ?? "customer_reported"),
    recordedAt: dateOnly(row.recorded_at),
    createdAt: toIso(row.created_at),
  };
}

export function mapDocument(row: Record<string, unknown>): DocumentRecord {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    vehicleId: row.vehicle_id == null ? null : String(row.vehicle_id),
    titleCaseId: row.title_case_id == null ? null : String(row.title_case_id),
    caseId: row.case_id == null ? null : String(row.case_id),
    documentType: (row.document_type as DocumentType) ?? "other",
    fileName: String(row.file_name),
    contentType: row.content_type == null ? null : String(row.content_type),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    status: String(row.status),
    createdAt: toIso(row.created_at),
  };
}

export async function assertVehicleAccess(actor: Actor, vehicleId: string) {
  const sql = await getSql();
  const rows = await sql.query("select * from vehicles where id = $1", [vehicleId]);
  const row = rows[0];
  if (!row) throw new NotFoundError("Vehicle not found");
  if (
    !canAccessOwned({
      actorId: actor.userId,
      actorRoles: actor.roles,
      ownerUserId: String(row.owner_user_id),
    })
  ) {
    throw new ForbiddenError();
  }
  return row;
}

async function vehicleExtras(vehicleId: string) {
  const sql = await getSql();
  const [ownership, lien, title, docs] = await Promise.all([
    sql.query<{ verification_status: string }>(
      `select verification_status from vehicle_ownership
       where vehicle_id = $1 order by created_at desc limit 1`,
      [vehicleId],
    ),
    sql.query<{ status: string }>(
      `select status from vehicle_liens
       where vehicle_id = $1 order by created_at desc limit 1`,
      [vehicleId],
    ),
    sql.query<{ status: string }>(
      `select c.status from title_cases t
       join cases c on c.id = t.case_id
       where t.vehicle_id = $1
       order by t.created_at desc limit 1`,
      [vehicleId],
    ),
    sql.query<{ count: number }>(
      "select count(*)::int as count from documents where vehicle_id = $1",
      [vehicleId],
    ),
  ]);
  return {
    ownershipStatus: ownership[0]?.verification_status ?? "none",
    lienStatus: lien[0]?.status ?? "unknown",
    titleCaseStatus: title[0]?.status ?? null,
    documentCount: docs[0]?.count ?? 0,
  };
}

export async function listOwnVehicles(actor: Actor): Promise<VehicleRecord[]> {
  const sql = await getSql();
  const rows = await sql.query(
    "select * from vehicles where owner_user_id = $1 and status <> 'placeholder' order by created_at desc",
    [actor.userId],
  );
  return Promise.all(rows.map(async (row) => mapVehicle(row, await vehicleExtras(String(row.id)))));
}

export async function adminListVehicles(actor: Actor): Promise<VehicleRecord[]> {
  assertPermission(actor, "vehicle:read:any");
  const sql = await getSql();
  const rows = await sql.query(
    "select * from vehicles where status <> 'placeholder' order by created_at desc limit 200",
  );
  return Promise.all(rows.map(async (row) => mapVehicle(row, await vehicleExtras(String(row.id)))));
}

export async function getAccessibleVehicle(actor: Actor, vehicleId: string) {
  const row = await assertVehicleAccess(actor, vehicleId);
  const sql = await getSql();
  const [ownership, liens, odometer, documents] = await Promise.all([
    sql.query(
      "select * from vehicle_ownership where vehicle_id = $1 order by created_at desc",
      [vehicleId],
    ),
    sql.query(
      "select * from vehicle_liens where vehicle_id = $1 order by created_at desc",
      [vehicleId],
    ),
    sql.query(
      "select * from odometer_records where vehicle_id = $1 order by created_at desc",
      [vehicleId],
    ),
    sql.query(
      "select * from documents where vehicle_id = $1 order by created_at desc",
      [vehicleId],
    ),
  ]);
  const extras = await vehicleExtras(vehicleId);
  return {
    vehicle: mapVehicle(row, extras),
    ownership: ownership.map(mapOwnership),
    liens: liens.map(mapLien),
    odometer: odometer.map(mapOdometer),
    documents: documents.map(mapDocument),
  };
}

export async function createVehicle(actor: Actor, input: unknown) {
  assertPermission(actor, "vehicle:write:own");
  const data = parseOrThrow(createVehicleSchema, input);
  const vin = validateVin(data.vin);
  if (!vin.ok) throw new AppError(vin.message, { status: 400 });
  const sql = await getSql();
  const dup = await sql.query(
    "select id from vehicles where owner_user_id = $1 and vin_normalized = $2",
    [actor.userId, vin.normalized],
  );
  if (dup.length > 0) {
    throw new AppError("This VIN is already on your account", { status: 409, code: "DUPLICATE_VEHICLE" });
  }
  const provider = await decodeVin();
  const providerMessage = provider.ok
    ? "External VIN decode is connected"
    : provider.message;
  const id = newId("veh");
  const year = data.year;
  const displayName = vehicleDisplayName({ year, make: data.make, model: data.model });
  await sql.query(
    `insert into vehicles (
      id, owner_user_id, display_name, status, vin, vin_normalized, year, make, model,
      trim, color, plate_number, plate_state, vin_format_valid, vin_checksum_valid,
      verification_status, provider_message
    ) values (
      $1,$2,$3,'active',$4,$5,$6,$7,$8,$9,$10,$11,$12,true,true,'format_validated',$13
    )`,
    [
      id,
      actor.userId,
      displayName,
      vin.normalized,
      vin.normalized,
      year,
      data.make,
      data.model,
      data.trim ? data.trim : null,
      data.color ? data.color : null,
      data.plateNumber ? data.plateNumber : null,
      data.plateState ? data.plateState : null,
      providerMessage,
    ],
  );
  const odometer =
    data.odometer === "" || data.odometer == null ? null : Number(data.odometer);
  if (odometer != null && !Number.isNaN(odometer)) {
    await sql.query(
      `insert into odometer_records (
        id, vehicle_id, owner_user_id, reading, unit, source, recorded_at
      ) values ($1,$2,$3,$4,'miles','customer_reported', current_date)`,
      [newId("odo"), id, actor.userId, odometer],
    );
  }
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "vehicle.created",
    resourceType: "vehicle",
    resourceId: id,
    metadata: { vinMasked: maskVin(vin.normalized), year, make: data.make },
  });
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "vin.validated",
    resourceType: "vehicle",
    resourceId: id,
    metadata: { result: VIN_FORMAT_VALIDATED, provider: providerMessage },
  });
  return (await getAccessibleVehicle(actor, id)).vehicle;
}

export async function saveOwnership(actor: Actor, input: unknown) {
  const data = parseOrThrow(ownershipSchema, input);
  const vehicle = await assertVehicleAccess(actor, data.vehicleId);
  if (String(vehicle.owner_user_id) !== actor.userId) {
    throw new ForbiddenError();
  }
  assertPermission(actor, "vehicle:write:own");
  const sql = await getSql();
  const id = newId("own");
  const price = data.purchasePrice?.trim() ? data.purchasePrice.trim() : null;
  await sql.query(
    `insert into vehicle_ownership (
      id, vehicle_id, owner_user_id, ownership_type, owner_name,
      acquisition_date, purchase_price, seller_name, verification_status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,'self_reported')`,
    [
      id,
      data.vehicleId,
      String(vehicle.owner_user_id),
      data.ownershipType,
      data.ownerName,
      data.acquisitionDate ? data.acquisitionDate : null,
      price,
      data.sellerName ? data.sellerName : null,
    ],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "ownership.created",
    resourceType: "vehicle",
    resourceId: data.vehicleId,
    metadata: { ownershipType: data.ownershipType, verificationStatus: "self_reported" },
  });
  const rows = await sql.query("select * from vehicle_ownership where id = $1", [id]);
  return mapOwnership(rows[0]!);
}

export async function saveLien(actor: Actor, input: unknown) {
  const data = parseOrThrow(lienSchema, input);
  const vehicle = await assertVehicleAccess(actor, data.vehicleId);
  if (String(vehicle.owner_user_id) !== actor.userId) {
    throw new ForbiddenError();
  }
  assertPermission(actor, "vehicle:write:own");
  const sql = await getSql();
  const id = newId("lien");
  await sql.query(
    `insert into vehicle_liens (
      id, vehicle_id, owner_user_id, title_case_id, status, lienholder_name, note
    ) values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      data.vehicleId,
      actor.userId,
      data.titleCaseId ?? null,
      data.status,
      data.lienholderName ? data.lienholderName : null,
      data.note ? data.note : null,
    ],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "lien.updated",
    resourceType: "vehicle",
    resourceId: data.vehicleId,
    metadata: { status: data.status, verified: false },
  });
  const rows = await sql.query("select * from vehicle_liens where id = $1", [id]);
  return mapLien(rows[0]!);
}

export async function updateStaffLien(actor: Actor, input: unknown) {
  assertPermission(actor, "review:act");
  const data = parseOrThrow(staffLienSchema, input);
  if (data.status === "verified") {
    throw new AppError("Verification requires a configured provider", { status: 400 });
  }
  const sql = await getSql();
  const rows = await sql.query("select * from vehicle_liens where id = $1", [data.lienId]);
  const row = rows[0];
  if (!row) throw new NotFoundError("Lien not found");
  await assertVehicleAccess(actor, String(row.vehicle_id));
  await sql.query(
    "update vehicle_liens set status = $2, note = coalesce($3, note), updated_at = now() where id = $1",
    [data.lienId, data.status, data.note ? data.note : null],
  );
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "lien.updated",
    resourceType: "vehicle",
    resourceId: String(row.vehicle_id),
    metadata: { status: data.status, verified: false, staff: true },
  });
  const next = await sql.query("select * from vehicle_liens where id = $1", [data.lienId]);
  return mapLien(next[0]!);
}

export async function listOwnDocuments(actor: Actor): Promise<DocumentRecord[]> {
  const sql = await getSql();
  const rows = await sql.query(
    "select * from documents where owner_user_id = $1 and status <> 'placeholder' order by created_at desc",
    [actor.userId],
  );
  return rows.map(mapDocument);
}

export async function uploadDocument(actor: Actor, input: unknown) {
  assertPermission(actor, "document:write:own");
  await assertIdentityVerified(actor);
  const data = parseOrThrow(uploadDocumentSchema, input);
  let ownerUserId = actor.userId;
  if (data.vehicleId) {
    const vehicle = await assertVehicleAccess(actor, data.vehicleId);
    ownerUserId = String(vehicle.owner_user_id);
    if (ownerUserId !== actor.userId) throw new ForbiddenError();
  }
  const stored = await putDocumentBlob({
    actor,
    fileName: data.fileName,
    contentType: data.contentType,
    contentBase64: data.contentBase64,
    documentType: data.documentType,
    vehicleId: data.vehicleId,
    titleCaseId: data.titleCaseId,
    caseId: data.caseId,
    ownerUserId,
  });
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "document.uploaded",
    resourceType: "document",
    resourceId: stored.id,
    metadata: {
      documentType: data.documentType,
      byteSize: stored.byteSize,
      vehicleId: data.vehicleId ?? null,
    },
  });
  const sql = await getSql();
  const rows = await sql.query("select * from documents where id = $1", [stored.id]);
  return mapDocument(rows[0]!);
}

export async function accessDocument(actor: Actor, documentId: string) {
  const sql = await getSql();
  const rows = await sql.query("select * from documents where id = $1", [documentId]);
  const row = rows[0];
  if (!row) throw new NotFoundError("Document not found");
  const ownerUserId = String(row.owner_user_id);
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
  const signed = await signDocumentAccess({ actor, documentId, ownerUserId });
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.primaryRole,
    action: "document.viewed",
    resourceType: "document",
    resourceId: documentId,
  });
  return { document: mapDocument(row), ...signed };
}

export async function nextCaseNumber() {
  const sql = await getSql();
  const seqRows = await sql.query<{ n: number }>(
    "select nextval('case_number_seq')::int as n",
  );
  return formatCaseNumber(new Date().getUTCFullYear(), seqRows[0]?.n ?? 1);
}
