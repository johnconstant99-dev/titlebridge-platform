import { randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_URL_TTL_SECONDS,
} from "@/lib/constants";
import { getSql } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertAllowedUpload, decodeBase64 } from "@/lib/documents";
import { can } from "@/lib/rbac";
import { newId } from "./ids";
import type { Actor } from "./actor";

const globalRef = globalThis as typeof globalThis & { __tbVaultSecret__?: string };

function vaultSecret(): Uint8Array {
  const env = process.env.BETTER_AUTH_SECRET?.trim();
  const raw = env || (globalRef.__tbVaultSecret__ ??= randomBytes(32).toString("hex"));
  return new TextEncoder().encode(raw);
}

export async function putDocumentBlob(input: {
  actor: Actor;
  fileName: string;
  contentType?: string | null;
  contentBase64: string;
  documentType: string;
  vehicleId?: string | null;
  titleCaseId?: string | null;
  caseId?: string | null;
  ownerUserId: string;
}) {
  const bytes = decodeBase64(input.contentBase64);
  if (bytes.byteLength > DOCUMENT_MAX_BYTES) {
    throw new Error("File exceeds the 5 MB limit");
  }
  const allowed = assertAllowedUpload({
    fileName: input.fileName,
    declaredType: input.contentType,
    byteLength: bytes.byteLength,
    bytes,
  });
  const sql = await getSql();
  const documentId = newId("doc");
  const blobId = newId("blob");
  const hex = Buffer.from(bytes).toString("hex");
  await sql.query(
    `insert into documents (
      id, owner_user_id, case_id, vehicle_id, title_case_id, document_type,
      file_name, original_name, storage_key, content_type, byte_size, status, vault
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'available','application_private')`,
    [
      documentId,
      input.ownerUserId,
      input.caseId ?? null,
      input.vehicleId ?? null,
      input.titleCaseId ?? null,
      input.documentType,
      allowed.fileName,
      allowed.fileName,
      documentId,
      allowed.contentType,
      bytes.byteLength,
    ],
  );
  await sql.query(
    `insert into document_blobs (id, document_id, content) values ($1,$2, decode($3, 'hex'))`,
    [blobId, documentId, hex],
  );
  return {
    id: documentId,
    fileName: allowed.fileName,
    contentType: allowed.contentType,
    byteSize: bytes.byteLength,
  };
}

export async function signDocumentAccess(input: {
  actor: Actor;
  documentId: string;
  ownerUserId: string;
}): Promise<{ url: string; expiresIn: number }> {
  if (
    input.actor.userId !== input.ownerUserId &&
    !can(input.actor.roles, "document:read:any")
  ) {
    throw new ForbiddenError();
  }
  const token = await new SignJWT({
    uid: input.actor.userId,
    did: input.documentId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DOCUMENT_URL_TTL_SECONDS}s`)
    .sign(vaultSecret());
  return {
    url: `/api/files?token=${encodeURIComponent(token)}`,
    expiresIn: DOCUMENT_URL_TTL_SECONDS,
  };
}

export async function peekDocumentToken(token: string): Promise<{ uid: string; did: string }> {
  let payload: { uid?: string; did?: string };
  try {
    const verified = await jwtVerify(token, vaultSecret());
    payload = verified.payload as { uid?: string; did?: string };
  } catch {
    throw new ForbiddenError("This document link has expired");
  }
  if (!payload.did || !payload.uid) throw new ForbiddenError();
  return { uid: payload.uid, did: payload.did };
}

export async function readDocumentFromToken(token: string): Promise<{
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  documentId: string;
  ownerUserId: string;
  actorUserId: string;
}> {
  const payload = await peekDocumentToken(token);
  const sql = await getSql();
  const rows = await sql.query(
    `select d.id, d.owner_user_id, d.file_name, d.content_type,
            encode(b.content, 'hex') as hex
     from documents d
     join document_blobs b on b.document_id = d.id
     where d.id = $1`,
    [payload.did],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError("Document not found");
  const ownerUserId = String(row.owner_user_id);
  const actorUserId = payload.uid;
  if (actorUserId !== ownerUserId) {
    const roleRows = await sql.query<{ role: string }>(
      "select role from user_roles where user_id = $1",
      [actorUserId],
    );
    const roles = roleRows.map((r) => r.role);
    const staff = roles.some((role) =>
      ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"].includes(role),
    );
    if (!staff) throw new ForbiddenError();
  }
  const hex = String(row.hex ?? "");
  return {
    fileName: String(row.file_name),
    contentType: String(row.content_type ?? "application/octet-stream"),
    bytes: Uint8Array.from(Buffer.from(hex, "hex")),
    documentId: String(row.id),
    ownerUserId,
    actorUserId,
  };
}
