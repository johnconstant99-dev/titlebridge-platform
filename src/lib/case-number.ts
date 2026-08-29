export function formatCaseNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid case year");
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Invalid case sequence");
  }
  return `TB-${year}-${String(sequence).padStart(6, "0")}`;
}

export function parseCaseNumber(value: string): { year: number; sequence: number } | null {
  const match = /^TB-(\d{4})-(\d{6})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Case numbers are identifiers, never authorization secrets. */
export function caseNumberIsNotAuthorization(_caseNumber: string): true {
  return true;
}
