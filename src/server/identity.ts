import { getServiceSql, getSql } from "@/lib/db";
import { writeAudit } from "@/server/audit";
import { newId } from "@/server/ids";
import type { Actor } from "@/server/actor";
import { identityAdapter, evaluateIdentityDecision } from "@/integrations/identity";
import { plaidConfig } from "@/integrations/plaid/env";
import { getIdentityVerification } from "@/integrations/plaid/client";
import { AppError } from "@/lib/errors";

export async function getOwnIdentityVerification(actor: Actor) {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    status: string;
    provider: string;
    provider_session_id: string | null;
    shareable_url: string | null;
    decision_reason: string | null;
    check_outcomes: Record<string, unknown> | null;
    updated_at: string;
  }>(
    "select id, status, provider, provider_session_id, shareable_url, decision_reason, check_outcomes, updated_at from identity_verification_records where user_id = $1 order by created_at desc limit 1",
    [actor.userId],
  );
  return {
    configured: plaidConfig().configured,
    environment: plaidConfig().env,
    record: rows[0] ?? null,
  };
}

export async function assertIdentityVerified(actor: Actor) {
  const current = await getOwnIdentityVerification(actor);
  if (current.record?.status === "verified") return current;
  throw new AppError(
    "Identity verification is required before this action. Complete verification under Identity.",
    { status: 403, code: "IDENTITY_NOT_VERIFIED" },
  );
}

async function persistDecision(input: {
  sessionId: string;
  session: Record<string, unknown>;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
}) {
  const decision = evaluateIdentityDecision(input.session);
  const shareableUrl =
    typeof input.session.shareable_url === "string" ? input.session.shareable_url : null;
  const service = await getServiceSql();
  await service.query(
    `update identity_verification_records
     set status = $2,
         shareable_url = coalesce($3, shareable_url),
         decision_reason = $4,
         check_outcomes = $5::jsonb,
         updated_at = now()
     where provider_session_id = $1`,
    [
      input.sessionId,
      decision.status,
      shareableUrl,
      decision.decisionReason,
      JSON.stringify(decision.checkOutcomes),
    ],
  );
  const rows = await service.query<{ id: string }>(
    "select id from identity_verification_records where provider_session_id = $1 limit 1",
    [input.sessionId],
  );
  await writeAudit({
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    resourceType: "identity_verification_records",
    resourceId: rows[0]?.id,
    metadata: { status: decision.status, decisionReason: decision.decisionReason },
  });
  return decision;
}

export async function startOwnIdentityVerification(
  actor: Actor,
  input: { gaveConsent: boolean; email?: string | null },
) {
  if (!input.gaveConsent) {
    throw new Error("Consent is required before starting identity verification.");
  }
  const adapter = identityAdapter();
  if (!adapter.configured) {
    throw new Error("Plaid Identity Verification is not configured on this environment.");
  }
  const result = await adapter.execute({
    clientUserId: actor.userId,
    email: input.email ?? undefined,
    gaveConsent: true,
  });
  if (!result.ok) throw new Error(result.message);
  const session = result.data as Record<string, unknown>;
  const sessionId = String(session.id ?? "");
  const shareableUrl = typeof session.shareable_url === "string" ? session.shareable_url : null;
  const decision = evaluateIdentityDecision(session);
  const service = await getServiceSql();
  const existing = await service.query<{ id: string }>(
    "select id from identity_verification_records where user_id = $1 order by created_at desc limit 1",
    [actor.userId],
  );
  const id = existing[0]?.id ?? newId("idv");
  if (existing[0]) {
    await service.query(
      `update identity_verification_records
       set provider = $2, status = $3, provider_session_id = $4, shareable_url = $5,
           decision_reason = $6, check_outcomes = $7::jsonb, updated_at = now()
       where id = $1`,
      [
        id,
        "plaid",
        decision.status,
        sessionId || null,
        shareableUrl,
        decision.decisionReason,
        JSON.stringify(decision.checkOutcomes),
      ],
    );
  } else {
    await service.query(
      `insert into identity_verification_records
         (id, user_id, provider, status, provider_session_id, shareable_url, decision_reason, check_outcomes)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        id,
        actor.userId,
        "plaid",
        decision.status,
        sessionId || null,
        shareableUrl,
        decision.decisionReason,
        JSON.stringify(decision.checkOutcomes),
      ],
    );
  }
  await writeAudit({
    actorUserId: actor.userId,
    actorRole: actor.roles?.[0] ?? actor.primaryRole ?? null,
    action: "identity.verification.started",
    resourceType: "identity_verification_records",
    resourceId: id,
    metadata: { status: decision.status },
  });
  return getOwnIdentityVerification(actor);
}

export async function refreshOwnIdentityVerification(actor: Actor) {
  const current = await getOwnIdentityVerification(actor);
  const sessionId = current.record?.provider_session_id;
  if (!sessionId) return current;
  const session = await getIdentityVerification(sessionId);
  await persistDecision({
    sessionId,
    session: session as Record<string, unknown>,
    actorUserId: actor.userId,
    actorRole: actor.roles?.[0] ?? actor.primaryRole ?? null,
    action: "identity.verification.refreshed",
  });
  return getOwnIdentityVerification(actor);
}

export async function applyPlaidIdentityWebhook(payload: Record<string, unknown>) {
  const sessionId =
    typeof payload.identity_verification_id === "string"
      ? payload.identity_verification_id
      : typeof (payload.identity_verification as { id?: string } | undefined)?.id === "string"
        ? (payload.identity_verification as { id: string }).id
        : null;
  if (!sessionId) return { ok: false as const, message: "missing session" };
  const session = await getIdentityVerification(sessionId);
  const decision = await persistDecision({
    sessionId,
    session: session as Record<string, unknown>,
    action: "identity.verification.webhook",
  });
  return { ok: true as const, status: decision.status };
}
