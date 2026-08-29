import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCheckDigit, normalizeVin } from "./vin.ts";
import {
  createCaseSchema,
  createVehicleSchema,
  lienSchema,
  onboardingSchema,
  parseOrThrow,
  passwordSchema,
  profileUpdateSchema,
  reviewActionSchema,
  signUpSchema,
  staffLienSchema,
  assignCaseSchema,
} from "./validation.ts";

function vinWithValidChecksum(seed: string): string {
  const base = normalizeVin(seed).padEnd(17, "0").slice(0, 17);
  const withZeroCheck = `${base.slice(0, 8)}0${base.slice(9)}`;
  const digit = computeCheckDigit(withZeroCheck);
  return `${withZeroCheck.slice(0, 8)}${digit}${withZeroCheck.slice(9)}`;
}

describe("validation", () => {
  it("rejects empty names on onboarding", () => {
    const result = onboardingSchema.safeParse({
      firstName: " ",
      lastName: "Lee",
      phone: "",
      state: "NY",
      notificationPreference: "email",
      acceptTerms: true,
      acceptPrivacy: true,
      acceptElectronic: true,
    });
    assert.equal(result.success, false);
  });

  it("rejects SSN-like extra fields by omitting them from the schema", () => {
    const parsed = parseOrThrow(onboardingSchema, {
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "555-0100",
      state: "CA",
      notificationPreference: "email",
      acceptTerms: true,
      acceptPrivacy: true,
      acceptElectronic: true,
      ssn: "123-45-6789",
    });
    assert.equal("ssn" in parsed, false);
    assert.equal(parsed.firstName, "Ada");
  });

  it("rejects weak passwords", () => {
    assert.equal(passwordSchema.safeParse("short").success, false);
    assert.equal(passwordSchema.safeParse("allletters").success, false);
    assert.equal(passwordSchema.safeParse("correcthorse1").success, true);
  });

  it("requires matching passwords on sign-up", () => {
    const result = signUpSchema.safeParse({
      email: "a@example.com",
      password: "correcthorse1",
      confirmPassword: "otherhorse1",
    });
    assert.equal(result.success, false);
  });

  it("rejects unknown case types", () => {
    assert.equal(
      createCaseSchema.safeParse({ caseType: "forged_title" }).success,
      false,
    );
  });

  it("rejects invalid state codes on profile update", () => {
    const result = profileUpdateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "",
      state: "XX",
      notificationPreference: "email",
    });
    assert.equal(result.success, false);
  });

  it("rejects an invalid VIN on vehicle create", () => {
    const result = createVehicleSchema.safeParse({
      vin: "1HGCM826I3A004352",
      year: 2020,
      make: "Honda",
      model: "Accord",
    });
    assert.equal(result.success, false);
  });

  it("accepts a checksum-valid VIN on vehicle create", () => {
    const result = createVehicleSchema.safeParse({
      vin: vinWithValidChecksum("1HGCM82633A004352"),
      year: 2020,
      make: "Honda",
      model: "Accord",
    });
    assert.equal(result.success, true);
  });

  it("never accepts verified from customer lien input", () => {
    const result = lienSchema.safeParse({
      vehicleId: "veh_1",
      status: "verified",
      lienholderName: "Bank",
    });
    assert.equal(result.success, false);
  });

  it("requires a lienholder when the customer reports a lien", () => {
    const result = lienSchema.safeParse({
      vehicleId: "veh_1",
      status: "customer_reports_lien",
      lienholderName: "",
    });
    assert.equal(result.success, false);
  });

  it("blocks staff from marking a lien verified without a provider", () => {
    const result = staffLienSchema.safeParse({
      lienId: "lien_1",
      status: "verified",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? "", /configured provider/);
    }
  });

  it("accepts staff lien statuses that are not verified", () => {
    const result = staffLienSchema.safeParse({
      lienId: "lien_1",
      status: "under_review",
    });
    assert.equal(result.success, true);
  });

  it("accepts internal review actions and rejects unknown ones", () => {
    assert.equal(
      reviewActionSchema.safeParse({
        titleCaseId: "ttl_1",
        section: "ownership",
        action: "approved",
      }).success,
      true,
    );
    assert.equal(
      reviewActionSchema.safeParse({
        titleCaseId: "ttl_1",
        section: "case",
        action: "verified",
      }).success,
      false,
    );
  });

  it("accepts case assignment payloads", () => {
    assert.equal(
      assignCaseSchema.safeParse({ caseId: "cse_1", assigneeUserId: "" }).success,
      true,
    );
    assert.equal(assignCaseSchema.safeParse({ caseId: "" }).success, false);
  });
});
