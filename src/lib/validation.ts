import { z } from "zod";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CUSTOMER_LIEN_STATUSES,
  DOCUMENT_TYPES,
  LIEN_STATUSES,
  NOTIFICATION_PREFERENCES,
  OWNERSHIP_TYPES,
  REVIEW_ACTIONS,
  REVIEW_SECTIONS,
  TITLE_TRANSACTION_TYPES,
  US_STATES,
} from "./constants.ts";
import { validateVin } from "./vin.ts";

const STATE_CODES = US_STATES.map((s) => s.code) as [string, ...string[]];

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[0-9+().\-\s]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: phoneSchema,
  state: z.enum(STATE_CODES, { message: "Select a state" }),
  notificationPreference: z.enum(NOTIFICATION_PREFERENCES),
  acceptTerms: z.literal(true, { message: "You must accept the terms of use" }),
  acceptPrivacy: z.literal(true, { message: "You must accept the privacy notice" }),
  acceptElectronic: z.literal(true, { message: "You must consent to electronic records" }),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: phoneSchema,
  state: z.enum(STATE_CODES),
  notificationPreference: z.enum(NOTIFICATION_PREFERENCES),
});

export const emailSchema = z.string().trim().email("Enter a valid email").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const createCaseSchema = z.object({
  caseType: z.enum(CASE_TYPES),
  jurisdiction: z.enum(STATE_CODES).optional(),
});

export const caseNoteSchema = z.object({
  caseId: z.string().min(1).max(80),
  note: z.string().trim().min(1, "Note is required").max(4000),
  visibility: z.enum(["internal", "customer"]),
});

export const caseStatusSchema = z.object({
  caseId: z.string().min(1).max(80),
  status: z.enum(CASE_STATUSES),
});

export const assignCaseSchema = z.object({
  caseId: z.string().min(1).max(80),
  assigneeUserId: z.string().trim().max(80).optional().or(z.literal("")),
});

export const roleAssignSchema = z.object({
  userId: z.string().min(1).max(80),
  role: z.string().min(1).max(40),
});

export const organizationCreateSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  organizationType: z.enum([
    "dealership",
    "lender",
    "fleet",
    "title_service",
    "auction",
    "insurance",
    "enterprise",
    "internal",
  ]),
});

const currentYear = new Date().getUTCFullYear();

export const vinField = z
  .string()
  .trim()
  .min(1, "VIN is required")
  .superRefine((value, ctx) => {
    const result = validateVin(value);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.message });
    }
  });

export const createVehicleSchema = z.object({
  vin: vinField,
  year: z.coerce.number().int().min(1981, "Year must be 1981 or later").max(currentYear + 1),
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),
  trim: z.string().trim().max(60).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  plateNumber: z.string().trim().max(15).optional().or(z.literal("")),
  plateState: z.enum(STATE_CODES).optional().or(z.literal("")),
  odometer: z.coerce.number().int().min(0).max(2_000_000).optional().or(z.literal("")),
});

export const ownershipSchema = z.object({
  vehicleId: z.string().min(1).max(80),
  ownershipType: z.enum(OWNERSHIP_TYPES),
  ownerName: z.string().trim().min(1, "Owner name is required").max(120),
  acquisitionDate: z.string().trim().optional().or(z.literal("")),
  purchasePrice: z.string().trim().max(20).optional().or(z.literal("")),
  sellerName: z.string().trim().max(120).optional().or(z.literal("")),
});

export const lienSchema = z.object({
  vehicleId: z.string().min(1).max(80),
  titleCaseId: z.string().min(1).max(80).optional(),
  status: z.enum(CUSTOMER_LIEN_STATUSES),
  lienholderName: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.status === "customer_reports_lien" && !data.lienholderName?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["lienholderName"],
      message: "Lienholder name is required when a lien is reported",
    });
  }
});

export const staffLienSchema = z.object({
  lienId: z.string().min(1).max(80),
  status: z.enum(LIEN_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.status === "verified") {
    ctx.addIssue({
      code: "custom",
      path: ["status"],
      message: "Verification requires a configured provider",
    });
  }
});

export const createTitleCaseSchema = z.object({
  vehicleId: z.string().min(1).max(80),
  transactionType: z.enum(TITLE_TRANSACTION_TYPES),
  jurisdiction: z.enum(STATE_CODES).optional(),
});

export const titleInfoSchema = z.object({
  titleCaseId: z.string().min(1).max(80),
  titleState: z.enum(STATE_CODES),
  titleNumberLast4: z
    .string()
    .trim()
    .max(4)
    .regex(/^[A-Za-z0-9]*$/, "Use only the last four characters")
    .optional()
    .or(z.literal("")),
  titleIssueDate: z.string().trim().optional().or(z.literal("")),
  titleNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const uploadDocumentSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(80).optional(),
  contentBase64: z.string().min(1, "File is required").max(7_300_000),
  documentType: z.enum(DOCUMENT_TYPES),
  vehicleId: z.string().min(1).max(80).optional(),
  titleCaseId: z.string().min(1).max(80).optional(),
  caseId: z.string().min(1).max(80).optional(),
});

export const reviewActionSchema = z.object({
  titleCaseId: z.string().min(1).max(80),
  section: z.enum(REVIEW_SECTIONS),
  action: z.enum(REVIEW_ACTIONS),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  assigneeUserId: z.string().trim().max(80).optional().or(z.literal("")),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(issue?.message ?? "Invalid input");
  }
  return result.data;
}
