import { redactMetadata } from "@/security/sanitize";

export function logError(scope: string, error: unknown, meta?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message,
      meta: redactMetadata(meta),
      ts: new Date().toISOString(),
    }),
  );
}

export function logInfo(scope: string, message: string, meta?: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      level: "info",
      scope,
      message,
      meta: redactMetadata(meta),
      ts: new Date().toISOString(),
    }),
  );
}
