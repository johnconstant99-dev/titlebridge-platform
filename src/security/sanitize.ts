const SECRET_KEYS = /password|secret|token|authorization|cookie|ssn|license|vin_full|contentbase64|filecontent|\bblob\b/i;



export function redactMetadata(input: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!input) return out;
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEYS.test(key)) continue;
    if (value == null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function truncateUserAgent(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 180);
}

export function minimizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.split(",")[0]?.trim() ?? "";
  if (!trimmed) return null;
  // Store only a truncated network hint, not a precise client identifier.
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.0.0/16`;
  }
  if (trimmed.includes(":")) {
    return trimmed.split(":").slice(0, 3).join(":") + "::/48";
  }
  return "redacted";
}

export function stripInternalIdsFromMessage(message: string): string {
  return message.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    "[id]",
  );
}
