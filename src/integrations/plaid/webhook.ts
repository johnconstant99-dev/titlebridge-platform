import { createHmac, timingSafeEqual } from "node:crypto";
import { plaidConfig } from "./env";

/**
 * Verify Plaid webhook body using HMAC-SHA256 against PLAID_WEBHOOK_SECRET.
 * Header accepted: `plaid-verification` or `x-plaid-signature` (hex digest).
 * When a secret is configured, missing/invalid signatures are rejected.
 */
export function verifyPlaidWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}): { ok: true } | { ok: false; message: string } {
  const secret = plaidConfig().webhookSecret;
  if (!secret) {
    // Fail closed in production-shaped config is enforced at startup; here allow only if unset.
    return { ok: true };
  }
  if (!input.signatureHeader) {
    return { ok: false, message: "Missing Plaid webhook signature" };
  }
  const expected = createHmac("sha256", secret).update(input.rawBody, "utf8").digest("hex");
  const provided = input.signatureHeader.trim().toLowerCase().replace(/^sha256=/, "");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "Invalid Plaid webhook signature" };
    }
  } catch {
    return { ok: false, message: "Invalid Plaid webhook signature" };
  }
  return { ok: true };
}
