import { getServiceSql } from "@/lib/db";
import { redactMetadata } from "@/security/sanitize";
import { newId } from "./ids";
import { logError } from "./logger";

/**
 * Trusted server-side audit writer. Uses the privileged service connection so
 * customers cannot INSERT into audit_logs through the application role.
 */
export async function writeAudit(input: {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sql = await getServiceSql();
    await sql.query(
      `insert into audit_logs (
        id, actor_user_id, actor_role, action, resource_type, resource_id, metadata
      ) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        newId("aud"),
        input.actorUserId ?? null,
        input.actorRole ?? null,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        JSON.stringify(redactMetadata(input.metadata)),
      ],
    );
  } catch (error) {
    logError("audit", error, { action: input.action });
  }
}
