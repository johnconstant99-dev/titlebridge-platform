export type IdentityStatus =
  | "pending"
  | "verified"
  | "needs_review"
  | "retry_required"
  | "failed"
  | "expired";

export type CheckOutcomes = {
  documentary?: string | null;
  selfie?: string | null;
  kyc?: string | null;
  watchlist?: string | null;
  riskCheck?: string | null;
  topLevelStatus?: string | null;
  decisionReason?: string | null;
};

function statusOf(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const status = (value as { status?: unknown }).status;
  return typeof status === "string" ? status.toLowerCase() : null;
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Map a full Plaid Identity Verification payload to TitleBridge status.
 * Uses documentary / selfie / kyc / watchlist outcomes, not only top-level status.
 */
export function evaluateIdentityDecision(session: Record<string, unknown>): {
  status: IdentityStatus;
  decisionReason: string | null;
  checkOutcomes: CheckOutcomes;
} {
  const topLevel = typeof session.status === "string" ? session.status.toLowerCase() : "";
  const documentary = statusOf(session.documentary_verification);
  const selfie = statusOf(session.selfie_check);
  const kyc = statusOf(session.kyc_check);
  const riskCheck = statusOf(session.risk_check);
  const watchlist =
    statusOf(session.watchlist_screening_results) ??
    statusOf(session.watchlist_screening) ??
    (typeof session.watchlist_screening_status === "string"
      ? session.watchlist_screening_status.toLowerCase()
      : null);

  const decisionReason =
    textOf(session.documentary_verification && (session.documentary_verification as { failure_reason?: unknown }).failure_reason) ||
    textOf(session.selfie_check && (session.selfie_check as { failure_reason?: unknown }).failure_reason) ||
    textOf(session.kyc_check && (session.kyc_check as { failure_reason?: unknown }).failure_reason) ||
    textOf(session.template && (session.template as { id?: unknown }).id) ||
    null;

  const checkOutcomes: CheckOutcomes = {
    documentary,
    selfie,
    kyc,
    watchlist,
    riskCheck,
    topLevelStatus: topLevel || null,
    decisionReason,
  };

  if (topLevel === "expired") {
    return { status: "expired", decisionReason: decisionReason ?? "session_expired", checkOutcomes };
  }

  if (topLevel === "canceled") {
    return { status: "failed", decisionReason: decisionReason ?? "canceled", checkOutcomes };
  }

  const checks = [documentary, selfie, kyc, riskCheck].filter(Boolean) as string[];
  const anyFailed = checks.some((s) => s === "failed" || s === "failure");
  const anyRetry = checks.some((s) => s === "retry" || s === "waiting_for_retry");
  const anyReview =
    topLevel === "pending_review" ||
    checks.some((s) => s === "pending_review" || s === "manual_review") ||
    watchlist === "hit" ||
    watchlist === "pending_review";
  const allSuccess =
    checks.length > 0 &&
    checks.every((s) => s === "success" || s === "pass" || s === "passed") &&
    (!watchlist || watchlist === "clear" || watchlist === "success" || watchlist === "not_screened");

  if (topLevel === "success" && (allSuccess || checks.length === 0)) {
    return { status: "verified", decisionReason: decisionReason ?? "passed", checkOutcomes };
  }

  if (anyReview) {
    return { status: "needs_review", decisionReason: decisionReason ?? "pending_review", checkOutcomes };
  }

  if (anyRetry) {
    return { status: "retry_required", decisionReason: decisionReason ?? "retry_required", checkOutcomes };
  }

  if (topLevel === "failed" || anyFailed) {
    return { status: "failed", decisionReason: decisionReason ?? "failed", checkOutcomes };
  }

  if (topLevel === "success") {
    // Top-level success but incomplete sub-checks still needs review, not auto-verify.
    return { status: "needs_review", decisionReason: decisionReason ?? "incomplete_checks", checkOutcomes };
  }

  return { status: "pending", decisionReason: decisionReason, checkOutcomes };
}
