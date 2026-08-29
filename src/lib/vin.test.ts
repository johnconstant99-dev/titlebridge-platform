import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCheckDigit, maskVin, normalizeVin, validateVin } from "./vin.ts";

function vinWithValidChecksum(seed: string): string {
  const base = normalizeVin(seed).padEnd(17, "0").slice(0, 17);
  const withZeroCheck = `${base.slice(0, 8)}0${base.slice(9)}`;
  const digit = computeCheckDigit(withZeroCheck);
  return `${withZeroCheck.slice(0, 8)}${digit}${withZeroCheck.slice(9)}`;
}

describe("vin validation", () => {
  it("normalizes to uppercase and strips separators", () => {
    assert.equal(normalizeVin("1hg-cm826 33a004352"), "1HGCM82633A004352");
  });

  it("rejects I, O, and Q", () => {
    const result = validateVin("1HGCM826I3A004352");
    assert.equal(result.ok, false);
    assert.match(result.message, /I, O, or Q/);
  });

  it("rejects short values", () => {
    const result = validateVin("1HGCM8263");
    assert.equal(result.ok, false);
    assert.equal(result.formatValid, false);
  });

  it("rejects a 17-character VIN with a bad checksum", () => {
    const result = validateVin("1HGCM82633A004353");
    assert.equal(result.ok, false);
    assert.equal(result.formatValid, true);
    assert.equal(result.checksumValid, false);
  });

  it("accepts a checksum-valid VIN and reports format validated", () => {
    const vin = vinWithValidChecksum("1HGCM82633A004352");
    const result = validateVin(vin.toLowerCase());
    assert.equal(result.ok, true);
    assert.equal(result.formatValid, true);
    assert.equal(result.checksumValid, true);
    assert.equal(result.message, "VIN format validated");
    assert.equal(result.normalized.length, 17);
  });

  it("masks all but the last four characters", () => {
    const vin = vinWithValidChecksum("1HGCM82633A004352");
    const masked = maskVin(vin);
    assert.equal(masked.endsWith(vin.slice(-4)), true);
    assert.equal(masked.includes(vin.slice(0, 8)), false);
  });
});
