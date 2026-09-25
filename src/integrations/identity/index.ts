import { createPlaceholderAdapter } from "../adapter";
import { plaidConfig } from "../plaid/env";
import { createIdentityVerification, getIdentityVerification } from "../plaid/client";
import type { AdapterResult, IntegrationAdapter, IntegrationEnvironment } from "../types";
import { evaluateIdentityDecision, type IdentityStatus } from "./decision";

/** @deprecated Prefer evaluateIdentityDecision for full payload mapping. */
export function mapPlaidStatus(status: string | undefined): IdentityStatus {
  switch (status) {
    case "success":
      return "verified";
    case "failed":
    case "canceled":
      return "failed";
    case "expired":
      return "expired";
    case "pending_review":
      return "needs_review";
    default:
      return "pending";
  }
}

export { evaluateIdentityDecision };
export type { IdentityStatus, CheckOutcomes } from "./decision";

export function identityAdapter(): IntegrationAdapter {
  const config = plaidConfig();
  const environment: IntegrationEnvironment = config.env === "sandbox" ? "sandbox" : "production";
  if (!config.configured) {
    return createPlaceholderAdapter("identity", "Identity verification", environment);
  }
  return {
    providerType: "identity",
    providerName: "Plaid Identity Verification",
    environment,
    configured: true,
    async execute(request) {
      const data = request as {
        action?: string;
        clientUserId?: string;
        sessionId?: string;
        email?: string;
        gaveConsent?: boolean;
      };
      if (data.action === "get" && data.sessionId) {
        const session = await getIdentityVerification(data.sessionId);
        return { ok: true, data: session } satisfies AdapterResult<typeof session>;
      }
      if (!data.clientUserId) {
        return { ok: false, code: "NOT_IMPLEMENTED", message: "clientUserId is required" };
      }
      const session = await createIdentityVerification({
        clientUserId: data.clientUserId,
        email: data.email,
        gaveConsent: Boolean(data.gaveConsent),
      });
      return { ok: true, data: session };
    },
  };
}

export async function verifyIdentity(request: Record<string, unknown> = {}) {
  return identityAdapter().execute(request);
}
