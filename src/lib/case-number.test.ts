import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCaseNumber, parseCaseNumber } from "./case-number.ts";

describe("case numbers", () => {
  it("formats human-friendly identifiers", () => {
    assert.equal(formatCaseNumber(2026, 1), "TB-2026-000001");
    assert.equal(formatCaseNumber(2026, 42), "TB-2026-000042");
  });

  it("parses valid identifiers and rejects noise", () => {
    assert.deepEqual(parseCaseNumber("TB-2026-000001"), { year: 2026, sequence: 1 });
    assert.equal(parseCaseNumber("TB-2026-1"), null);
    assert.equal(parseCaseNumber("VIN-2026-000001"), null);
  });
});
