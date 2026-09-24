import { plaidConfig } from "./env";

type PlaidJson = Record<string, unknown>;

async function plaidRequest(path: string, body: Record<string, unknown>): Promise<PlaidJson> {
  const config = plaidConfig();
  if (!config.configured || !config.clientId || !config.secret) {
    throw new Error("Plaid is not configured");
  }
  const response = await fetch(`${config.host}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      secret: config.secret,
      ...body,
    }),
  });
  const json = (await response.json()) as PlaidJson;
  if (!response.ok) {
    const raw =
      typeof json.error_message === "string" ? json.error_message : `Plaid request failed (${response.status})`;
    const code = typeof json.error_code === "string" ? json.error_code : "";
    if (code === "INVALID_CLIENT_ID" || /invalid client_id or secret/i.test(raw)) {
      throw new Error(
        `Plaid rejected the ${config.env} keys. In the Plaid Dashboard open the ${config.env} toggle, copy Client ID + the ${config.env} secret from the same team, then replace PLAID_CLIENT_ID and PLAID_SECRET in Vercel Production and redeploy.`,
      );
    }
    throw new Error(raw);
  }
  return json;
}

export async function createIdentityVerification(input: {
  clientUserId: string;
  email?: string | null;
  gaveConsent: boolean;
}) {
  const config = plaidConfig();
  if (!config.templateId) throw new Error("PLAID_TEMPLATE_ID is required");
  return plaidRequest("/identity_verification/create", {
    template_id: config.templateId,
    client_user_id: input.clientUserId,
    gave_consent: input.gaveConsent,
    is_idempotent: true,
    is_shareable: true,
    user: input.email ? { email_address: input.email } : undefined,
  });
}

export async function getIdentityVerification(identityVerificationId: string) {
  return plaidRequest("/identity_verification/get", {
    identity_verification_id: identityVerificationId,
  });
}
