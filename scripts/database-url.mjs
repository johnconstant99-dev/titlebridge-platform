const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const PLACEHOLDER_HOSTS = new Set(["base", "database", "postgres", "postgresql"]);

/**
 * Validate the connection string before node-postgres attempts DNS resolution.
 * Returns the original value so callers can pass it directly to pg without
 * exposing credentials in logs.
 */
export function validateDatabaseUrl(value = process.env.DATABASE_URL) {
  if (!value || !value.trim()) return undefined;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid PostgreSQL connection string. Set it to a URL such as postgres://USER:PASSWORD@HOST/DATABASE?sslmode=require.",
    );
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol) || !url.hostname) {
    throw new Error(
      "DATABASE_URL must use the postgres:// or postgresql:// scheme and include a database host.",
    );
  }

  if (PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `DATABASE_URL uses the placeholder host “${url.hostname}”. Replace it with the hostname from your managed PostgreSQL provider (for Neon, use the pooled connection string).`,
    );
  }

  return value;
}
