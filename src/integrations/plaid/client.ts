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
    const errorMessage =
      typeof json.error_message === "string" ? json.error_message : `Plaid request failed (${response.status})`;
    throw new Error(errorMessage);
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
