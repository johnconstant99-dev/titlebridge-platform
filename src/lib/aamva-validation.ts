/**
 * AAMVA Standards-Readiness Validation Layer
 *
 * This module provides local data validation for AAMVA-relevant fields:
 * - VIN format and ISO 3779 checksum validation
 * - Recognized US jurisdiction (state) codes
 * - Required vehicle identification fields
 * - Supported transaction types
 *
 * IMPORTANT: This module performs LOCAL VALIDATION ONLY. It does NOT:
 * - Connect to AAMVA, DMV, NMVTIS, ELT, EVR, or any government system
 * - Return fabricated government-record responses
 * - Verify vehicle ownership or legal authorization
 * - Claim AAMVA certification or DMV approval
 * - Weaken authentication, authorization, RLS (Row-Level Security), or audit controls
 *
 * Formal AAMVA conformance, government-record verification, and legal authorization
 * require separate integration adapters under src/integrations/ that are explicitly
 * configured and never auto-faked.
 *
 * @module aamva-validation
 */

import { validateVin as performVinValidation, type VinValidation } from "./vin.ts";
import { US_STATES, TITLE_TRANSACTION_TYPES } from "./constants.ts";
import type { TitleTransactionType } from "./types.ts";

/**
 * Recognized US jurisdiction codes (states + DC).
 * Derived from US_STATES constant to maintain single source of truth.
 */
export const RECOGNIZED_JURISDICTIONS = US_STATES.map((s) => s.code) as const;
export type RecognizedJurisdiction = (typeof RECOGNIZED_JURISDICTIONS)[number];

/**
 * Supported transaction types for AAMVA workflows.
 * Derived from TITLE_TRANSACTION_TYPES to reuse existing constants.
 */
export const SUPPORTED_TRANSACTION_TYPES = TITLE_TRANSACTION_TYPES;
export type SupportedTransactionType = TitleTransactionType;

/**
 * Validation result for a single field or composite check.
 */
export interface FieldValidationResult {
  valid: boolean;
  fieldName: string;
  value: unknown;
  message: string;
}

/**
 * Comprehensive validation result for vehicle data.
 */
export interface VehicleValidationResult {
  ok: boolean;
  vin: FieldValidationResult;
  year: FieldValidationResult;
  make: FieldValidationResult;
  model: FieldValidationResult;
  jurisdiction: FieldValidationResult;
  transactionType: FieldValidationResult;
  summary: {
    validFieldCount: number;
    totalFields: number;
    localValidationOnly: boolean;
    disclaimer: string;
  };
}

/**
 * Validation result for transaction type and jurisdiction.
 */
export interface TransactionValidationResult {
  ok: boolean;
  transactionType: FieldValidationResult;
  jurisdiction: FieldValidationResult;
  summary: {
    validFieldCount: number;
    totalFields: number;
    localValidationOnly: boolean;
    disclaimer: string;
  };
}

/**
 * Check if a jurisdiction code is recognized (US state or DC).
 *
 * @param code - Two-letter state code or "DC"
 * @returns true if the code is in the recognized list
 */
export function isRecognizedJurisdiction(code: unknown): code is RecognizedJurisdiction {
  if (typeof code !== "string") return false;
  return RECOGNIZED_JURISDICTIONS.includes(code as RecognizedJurisdiction);
}

/**
 * Check if a transaction type is supported.
 *
 * @param type - Transaction type string
 * @returns true if the type is in the supported list
 */
export function isSupportedTransactionType(type: unknown): type is SupportedTransactionType {
  if (typeof type !== "string") return false;
  return SUPPORTED_TRANSACTION_TYPES.includes(type as SupportedTransactionType);
}

/**
 * Validate VIN format and checksum using existing VIN validator.
 * Returns structured validation result.
 *
 * @param vin - VIN string (normalized internally)
 * @returns FieldValidationResult with detailed validation status
 */
export function validateVinField(vin: unknown): FieldValidationResult {
  if (typeof vin !== "string") {
    return {
      valid: false,
      fieldName: "vin",
      value: vin,
      message: "VIN must be a string",
    };
  }

  const validation: VinValidation = performVinValidation(vin);
  return {
    valid: validation.ok,
    fieldName: "vin",
    value: validation.normalized,
    message: validation.message,
  };
}

/**
 * Validate vehicle year (model year).
 * Accepts years 1900–current year + 1 (for pre-production vehicles).
 *
 * @param year - Model year
 * @returns FieldValidationResult
 */
export function validateYearField(year: unknown): FieldValidationResult {
  if (year === null || year === undefined || year === "") {
    return {
      valid: false,
      fieldName: "year",
      value: year,
      message: "Year is required",
    };
  }

  const parsed = typeof year === "string" ? parseInt(year, 10) : year;
  if (!Number.isInteger(parsed)) {
    return {
      valid: false,
      fieldName: "year",
      value: year,
      message: "Year must be an integer",
    };
  }

  const currentYear = new Date().getUTCFullYear();
  const minYear = 1900;
  const maxYear = currentYear + 1; // Allow pre-production vehicles

  if (parsed < minYear || parsed > maxYear) {
    return {
      valid: false,
      fieldName: "year",
      value: parsed,
      message: `Year must be between ${minYear} and ${maxYear}`,
    };
  }

  return {
    valid: true,
    fieldName: "year",
    value: parsed,
    message: "Year format validated",
  };
}

/**
 * Validate vehicle make (manufacturer name).
 * Required field: 1–100 characters, no leading/trailing whitespace.
 *
 * @param make - Manufacturer name
 * @returns FieldValidationResult
 */
export function validateMakeField(make: unknown): FieldValidationResult {
  if (make === null || make === undefined || make === "") {
    return {
      valid: false,
      fieldName: "make",
      value: make,
      message: "Make is required",
    };
  }

  if (typeof make !== "string") {
    return {
      valid: false,
      fieldName: "make",
      value: make,
      message: "Make must be a string",
    };
  }

  const trimmed = make.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      fieldName: "make",
      value: make,
      message: "Make cannot be empty or only whitespace",
    };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      fieldName: "make",
      value: trimmed,
      message: "Make must not exceed 100 characters",
    };
  }

  return {
    valid: true,
    fieldName: "make",
    value: trimmed,
    message: "Make format validated",
  };
}

/**
 * Validate vehicle model (model name).
 * Required field: 1–100 characters, no leading/trailing whitespace.
 *
 * @param model - Model name
 * @returns FieldValidationResult
 */
export function validateModelField(model: unknown): FieldValidationResult {
  if (model === null || model === undefined || model === "") {
    return {
      valid: false,
      fieldName: "model",
      value: model,
      message: "Model is required",
    };
  }

  if (typeof model !== "string") {
    return {
      valid: false,
      fieldName: "model",
      value: model,
      message: "Model must be a string",
    };
  }

  const trimmed = model.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      fieldName: "model",
      value: model,
      message: "Model cannot be empty or only whitespace",
    };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      fieldName: "model",
      value: trimmed,
      message: "Model must not exceed 100 characters",
    };
  }

  return {
    valid: true,
    fieldName: "model",
    value: trimmed,
    message: "Model format validated",
  };
}

/**
 * Validate jurisdiction (US state or DC).
 * Optional field; if provided, must be a recognized jurisdiction.
 *
 * @param jurisdiction - State code or null/undefined
 * @returns FieldValidationResult
 */
export function validateJurisdictionField(jurisdiction: unknown): FieldValidationResult {
  // Jurisdiction is optional
  if (jurisdiction === null || jurisdiction === undefined || jurisdiction === "") {
    return {
      valid: true,
      fieldName: "jurisdiction",
      value: null,
      message: "Jurisdiction not specified (optional)",
    };
  }

  if (typeof jurisdiction !== "string") {
    return {
      valid: false,
      fieldName: "jurisdiction",
      value: jurisdiction,
      message: "Jurisdiction must be a string or null",
    };
  }

  const normalized = jurisdiction.toUpperCase().trim();
  if (!isRecognizedJurisdiction(normalized)) {
    return {
      valid: false,
      fieldName: "jurisdiction",
      value: normalized,
      message: `${normalized} is not a recognized US jurisdiction. Use two-letter state codes (e.g., TX, CA, NY) or DC.`,
    };
  }

  return {
    valid: true,
    fieldName: "jurisdiction",
    value: normalized,
    message: "Jurisdiction recognized",
  };
}

/**
 * Validate transaction type.
 * Optional field; if provided, must be a supported type.
 *
 * @param transactionType - Transaction type or null/undefined
 * @returns FieldValidationResult
 */
export function validateTransactionTypeField(transactionType: unknown): FieldValidationResult {
  // Transaction type is optional
  if (transactionType === null || transactionType === undefined || transactionType === "") {
    return {
      valid: true,
      fieldName: "transactionType",
      value: null,
      message: "Transaction type not specified (optional)",
    };
  }

  if (typeof transactionType !== "string") {
    return {
      valid: false,
      fieldName: "transactionType",
      value: transactionType,
      message: "Transaction type must be a string or null",
    };
  }

  if (!isSupportedTransactionType(transactionType)) {
    return {
      valid: false,
      fieldName: "transactionType",
      value: transactionType,
      message: `${transactionType} is not a supported transaction type. Supported: ${SUPPORTED_TRANSACTION_TYPES.join(", ")}`,
    };
  }

  return {
    valid: true,
    fieldName: "transactionType",
    value: transactionType,
    message: "Transaction type recognized",
  };
}

/**
 * Comprehensive vehicle validation for AAMVA readiness.
 * Validates VIN (format and checksum), year, make, model, jurisdiction, and transaction type.
 *
 * IMPORTANT: This is LOCAL VALIDATION ONLY.
 * It does NOT verify actual ownership, legal authorization, or connect to government systems.
 *
 * @param input - Vehicle data object
 * @returns VehicleValidationResult with per-field results and summary
 */
export function validateVehicleForAAMVA(input: {
  vin: unknown;
  year: unknown;
  make: unknown;
  model: unknown;
  jurisdiction?: unknown;
  transactionType?: unknown;
}): VehicleValidationResult {
  const vinResult = validateVinField(input.vin);
  const yearResult = validateYearField(input.year);
  const makeResult = validateMakeField(input.make);
  const modelResult = validateModelField(input.model);
  const jurisdictionResult = validateJurisdictionField(input.jurisdiction);
  const transactionTypeResult = validateTransactionTypeField(input.transactionType);

  const allResults = [
    vinResult,
    yearResult,
    makeResult,
    modelResult,
    jurisdictionResult,
    transactionTypeResult,
  ];
  const validCount = allResults.filter((r) => r.valid).length;
  const totalCount = allResults.length;

  return {
    ok: allResults.every((r) => r.valid),
    vin: vinResult,
    year: yearResult,
    make: makeResult,
    model: modelResult,
    jurisdiction: jurisdictionResult,
    transactionType: transactionTypeResult,
    summary: {
      validFieldCount: validCount,
      totalFields: totalCount,
      localValidationOnly: true,
      disclaimer:
        "This validation confirms local data format only. It does NOT verify ownership, vehicle registration status, or legal authorization. Formal AAMVA conformance, government-record verification, and legal authorization require separate configured provider integrations.",
    },
  };
}

/**
 * Transaction validation for AAMVA readiness.
 * Validates jurisdiction and transaction type.
 *
 * IMPORTANT: This is LOCAL VALIDATION ONLY.
 * It does NOT verify authorization or connect to government systems.
 *
 * @param input - Transaction data
 * @returns TransactionValidationResult
 */
export function validateTransactionForAAMVA(input: {
  jurisdiction?: unknown;
  transactionType?: unknown;
}): TransactionValidationResult {
  const jurisdictionResult = validateJurisdictionField(input.jurisdiction);
  const transactionTypeResult = validateTransactionTypeField(input.transactionType);

  const allResults = [jurisdictionResult, transactionTypeResult];
  const validCount = allResults.filter((r) => r.valid).length;
  const totalCount = allResults.length;

  return {
    ok: allResults.every((r) => r.valid),
    jurisdiction: jurisdictionResult,
    transactionType: transactionTypeResult,
    summary: {
      validFieldCount: validCount,
      totalFields: totalCount,
      localValidationOnly: true,
      disclaimer:
        "This validation confirms local data format only. It does NOT verify authorization or connect to government systems. Formal AAMVA conformance and legal authorization require separate configured provider integrations.",
    },
  };
}
