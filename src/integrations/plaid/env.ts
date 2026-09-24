export type PlaidEnvName = "sandbox" | "production";

export function plaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID?.trim();
  const secret = process.env.PLAID_SECRET?.trim();
  const templateId = process.env.PLAID_TEMPLATE_ID?.trim();
  const rawEnv = (process.env.PLAID_ENV ?? "production").trim().toLowerCase();
  const env: PlaidEnvName = rawEnv === "sandbox" ? "sandbox" : "production";
  return {
    clientId,
    secret,
    templateId,
    env,
    configured: Boolean(clientId && secret && templateId),
    webhookSecret: process.env.PLAID_WEBHOOK_SECRET?.trim() ?? null,
    host: env === "sandbox" ? "https://sandbox.plaid.com" : "https://production.plaid.com",
  };
}
