export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(message: string, options?: { status?: number; code?: string; expose?: boolean }) {
    super(message);
    this.name = "AppError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "APP_ERROR";
    this.expose = options?.expose ?? true;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, { status: 403, code: "FORBIDDEN" });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, { status: 404, code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export function toClientError(error: unknown): { message: string; status: number; code: string } {
  if (error instanceof AppError && error.expose) {
    return { message: error.message, status: error.status, code: error.code };
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return { message: "Unauthorized", status: 401, code: "UNAUTHORIZED" };
  }
  if (error instanceof Error) {
    const known = error.message;
    const looksTechnical =
      /column "|relation "|does not exist|syntax error|duplicate key|violates |postgres|pglite|sqlite|node_modules|\/src\/|[A-Z]:\\/i.test(
        known,
      ) ||
      known.includes("at ") ||
      known.toLowerCase().includes("stack");
    if (known.length > 0 && known.length < 180 && !looksTechnical) {
      return { message: known, status: 400, code: "INVALID_INPUT" };
    }
  }
  return { message: "Something went wrong. Please try again.", status: 500, code: "INTERNAL" };
}

/** User-facing Better Auth / network errors. Never leak origin, SQL, or stack details. */
export function toAuthClientMessage(message: string | null | undefined, fallback: string): string {
  if (!message) return fallback;
  if (
    /invalid origin|csrf|failed to fetch|network error|econnrefused|internal server|postgres|pglite|sql |stack|node_modules/i.test(
      message,
    )
  ) {
    return fallback;
  }
  if (message.length > 180) return fallback;
  return message;
}
