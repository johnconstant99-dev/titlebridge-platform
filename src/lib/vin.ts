const VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
  "6": 6, "7": 7, "8": 8, "9": 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type VinValidation = {
  ok: boolean;
  normalized: string;
  formatValid: boolean;
  checksumValid: boolean;
  message: string;
};

export function normalizeVin(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function computeCheckDigit(normalized: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    if (i === 8) continue;
    const mapped = TRANSLITERATION[normalized[i] ?? ""];
    if (mapped === undefined) return "";
    sum += mapped * (WEIGHTS[i] ?? 0);
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

export function validateVin(value: string): VinValidation {
  const normalized = normalizeVin(value);
  if (normalized.length === 0) {
    return {
      ok: false,
      normalized,
      formatValid: false,
      checksumValid: false,
      message: "VIN is required",
    };
  }
  if (/[IOQ]/.test(normalized)) {
    return {
      ok: false,
      normalized,
      formatValid: false,
      checksumValid: false,
      message: "VIN cannot include I, O, or Q",
    };
  }
  if (normalized.length !== 17) {
    return {
      ok: false,
      normalized,
      formatValid: false,
      checksumValid: false,
      message: "Enter a 17-character VIN",
    };
  }
  if (!VIN_CHARS.test(normalized)) {
    return {
      ok: false,
      normalized,
      formatValid: false,
      checksumValid: false,
      message: "VIN contains invalid characters",
    };
  }
  const expected = computeCheckDigit(normalized);
  const checksumValid = normalized[8] === expected;
  if (!checksumValid) {
    return {
      ok: false,
      normalized,
      formatValid: true,
      checksumValid: false,
      message: "VIN checksum is invalid",
    };
  }
  return {
    ok: true,
    normalized,
    formatValid: true,
    checksumValid: true,
    message: "VIN format validated",
  };
}

export function maskVin(vin: string | null | undefined): string {
  if (!vin) return "—";
  const normalized = normalizeVin(vin);
  if (normalized.length < 5) return "••••";
  return `${"•".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function vehicleDisplayName(input: {
  year?: number | null;
  make?: string | null;
  model?: string | null;
}): string {
  const parts = [input.year, input.make, input.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Vehicle";
}
