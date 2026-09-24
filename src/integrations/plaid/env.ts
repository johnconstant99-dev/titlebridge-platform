export type PlaidEnvName = "sandbox" | "production";

function clean(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "").trim();
  return trimmed.length ? trimmed : undefined;
}

export function plaidConfig() {
  const clientId = clean(process.env.PLAID_CLIENT_ID);
  const secret = clean(process.env.PLAID_SECRET);
  const templateId =
    clean(process.env.PLAID_TEMPLATE_ID) || clean(process.env.PLAID_IDV_TEMPLATE_ID);
  const rawEnv = (clean(process.env.PLAID_ENV) ?? "production").toLowerCase();
  const env: PlaidEnvName = rawEnv === "sandbox" ? "sandbox" : "production";
  return {
    clientId,
    secret,
    templateId,
    env,
    configured: Boolean(clientId && secret && templateId),
    webhookSecret: clean(process.env.PLAID_WEBHOOK_SECRET) ?? null,
    host: env === "sandbox" ? "https://sandbox.plaid.com" : "https://production.plaid.com",
  };
}
