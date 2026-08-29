import { auth } from "@/lib/auth/server";
import { withRlsContext } from "@/lib/db";
import { toClientError } from "@/lib/errors";
import { applySecurityHeaders } from "@/security/headers";
import { assertRateLimit } from "@/security/rate-limit";
import { loadActor, type Actor } from "./actor";
import { logError } from "./logger";

export function json(data: unknown, status = 200) {
  const headers = new Headers({ "Content-Type": "application/json" });
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function requireApiActor(request: Request): Promise<Actor> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  assertRateLimit(`api:${ip}`, { windowMs: 60_000, max: 120 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return loadActor(session.user.id, session.user.email ?? null);
}

export async function withApiActor<T>(
  request: Request,
  fn: (actor: Actor) => Promise<T>,
): Promise<T> {
  const actor = await requireApiActor(request);
  return withRlsContext({ userId: actor.userId, role: actor.primaryRole }, () => fn(actor));
}

export function handleApiError(scope: string, error: unknown) {
  const client = toClientError(error);
  if (client.status >= 500) logError(scope, error);
  return json({ error: client.message, code: client.code }, client.status);
}
