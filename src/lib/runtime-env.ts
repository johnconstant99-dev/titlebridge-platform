/**
 * Production vs preview runtime guards.
 * Seed/demo data must never load when a real database or production host is used.
 */
function isVercelRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  const vercel = env.VERCEL?.trim();
  return Boolean(vercel && vercel !== "0" && vercel.toLowerCase() !== "false");
}

export function isProductionRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === "production") return true;
  if (isVercelRuntime(env)) return true;
  if (env.DATABASE_URL?.trim()) return true;
  return false;
}

export function allowDevelopmentSeed(input: {
  env?: NodeJS.ProcessEnv;
  dbSource: "neon" | "pglite";
}): boolean {
  if (isProductionRuntime(input.env)) return false;
  return input.dbSource === "pglite";
}

/**
 * Hosted production (Vercel / grok.me) must not fall back to in-memory PGLite
 * or an ephemeral auth secret. Local `vite build` / `vite preview` are not
 * hosted production and may still use the preview database.
 */
export function isHostedProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return isVercelRuntime(env);
}

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "").trim();
  return trimmed.length ? trimmed : undefined;
}

export function assertHostedProductionConfig(input: {
  env?: NodeJS.ProcessEnv;
  databaseUrl?: string | null;
} = {}): void {
  const env = input.env ?? process.env;
  if (!isHostedProduction(env)) return;
  const databaseUrl = (input.databaseUrl ?? env.DATABASE_URL)?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required in hosted production. TitleBridge will not start on the in-memory preview database.",
    );
  }
  if (!env.BETTER_AUTH_SECRET?.trim()) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in hosted production. TitleBridge will not start with an ephemeral preview secret.",
    );
  }
  const plaidClientId = cleanEnv(env.PLAID_CLIENT_ID);
  const plaidSecret = cleanEnv(env.PLAID_SECRET);
  const plaidTemplate =
    cleanEnv(env.PLAID_TEMPLATE_ID) || cleanEnv(env.PLAID_IDV_TEMPLATE_ID);
  if (!plaidClientId || !plaidSecret || !plaidTemplate) {
    throw new Error(
      "PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_TEMPLATE_ID (or PLAID_IDV_TEMPLATE_ID) are required in hosted production.",
    );
  }
}
