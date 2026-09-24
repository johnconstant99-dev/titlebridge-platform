export const APP_NAME = "TitleBridge";
export const APP_TAGLINE = "A clearer path through vehicle transactions.";
export const APP_CAMPAIGN = "The Future of Vehicle Workflows Starts With Trust.";
export const PHASE_LABEL = "Phase 1B Private Beta";

export const PLATFORM_DISCLAIMER =
  "TitleBridge is an independent technology platform and is not a government agency or motor vehicle department. Availability of electronic title, registration, lien, and vehicle-record services depends on jurisdiction, authorization, and participating providers. TitleBridge.org is not affiliated with Title Bridge, LLC.";

export const IDENTITY_NOTICE =
  "Identity verification will be required before regulated vehicle transactions can be submitted.";

export const TITLE_SUBMIT_NOTICE =
  "Submit sends this record to TitleBridge internal review only. It does not file with a motor-vehicle department.";

export const VIN_FORMAT_VALIDATED = "VIN format validated";

export const ROLES = [
  "CUSTOMER",
  "OPERATIONS",
  "COMPLIANCE",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export const ASSIGNABLE_ROLES = [
  "CUSTOMER",
  "OPERATIONS",
  "COMPLIANCE",
  "ADMIN",
] as const;

export const STAFF_ROLES = [
  "OPERATIONS",
  "COMPLIANCE",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export const CASE_TYPES = [
  "title",
  "registration",
  "title_transfer",
  "lien_release",
  "duplicate_title",
  "vehicle_sale",
  "correction",
  "ownership_change",
  "private_party_sale",
  "dealer_sale",
  "other",
] as const;

export const CASE_STATUSES = [
  "draft",
  "awaiting_customer",
  "under_review",
  "verification_required",
  "documents_required",
  "ready_for_submission",
  "submitted",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;

export const OPERATIONS_STATUS_TRANSITIONS = [
  "awaiting_customer",
  "under_review",
  "verification_required",
  "documents_required",
  "ready_for_submission",
  "rejected",
  "cancelled",
] as const;

export const ORGANIZATION_TYPES = [
  "dealership",
  "lender",
  "fleet",
  "title_service",
  "auction",
  "insurance",
  "enterprise",
  "internal",
] as const;

export const NOTIFICATION_PREFERENCES = ["email", "sms", "none"] as const;

export const OWNERSHIP_TYPES = [
  "sole",
  "joint",
  "business",
  "financed",
  "leased",
  "other",
] as const;

export const TITLE_TRANSACTION_TYPES = [
  "title_transfer",
  "duplicate_title",
  "correction",
  "lien_release",
  "ownership_change",
  "private_party_sale",
  "dealer_sale",
  "other",
] as const;

export const TITLE_STEPS = [
  "vehicle",
  "ownership",
  "title",
  "lien",
  "documents",
  "review",
  "submitted",
] as const;

export const LIEN_STATUSES = [
  "unknown",
  "customer_reports_no_lien",
  "customer_reports_lien",
  "document_uploaded",
  "under_review",
  "released",
  "verified",
] as const;

export const CUSTOMER_LIEN_STATUSES = [
  "unknown",
  "customer_reports_no_lien",
  "customer_reports_lien",
] as const;

export const DOCUMENT_TYPES = [
  "title",
  "registration",
  "bill_of_sale",
  "lien_release",
  "purchase_agreement",
  "odometer_disclosure",
  "insurance_document",
  "supporting_document",
  "other",
] as const;

export const DOCUMENT_MIME_ALLOWLIST = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_URL_TTL_SECONDS = 5 * 60;

export const REVIEW_SECTIONS = ["ownership", "title", "lien", "documents", "case"] as const;
export const REVIEW_ACTIONS = [
  "approved",
  "info_requested",
  "flagged",
  "rejected",
  "assigned",
  "reassigned",
] as const;

export const CONSENT_TERMS_VERSION = "2026-08-1b";
export const CONSENT_PRIVACY_VERSION = "2026-08-1b";
export const CONSENT_ELECTRONIC_VERSION = "2026-08-1b";

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const CASE_TYPE_LABELS: Record<(typeof CASE_TYPES)[number], string> = {
  title: "Title",
  registration: "Registration",
  title_transfer: "Title transfer",
  lien_release: "Lien release",
  duplicate_title: "Duplicate title",
  vehicle_sale: "Vehicle sale",
  correction: "Correction",
  ownership_change: "Ownership change",
  private_party_sale: "Private party sale",
  dealer_sale: "Dealer sale",
  other: "Other",
};

export const CASE_STATUS_LABELS: Record<(typeof CASE_STATUSES)[number], string> = {
  draft: "Draft",
  awaiting_customer: "Awaiting customer",
  under_review: "Under review",
  verification_required: "Verification required",
  documents_required: "Documents required",
  ready_for_submission: "Ready for internal review",
  submitted: "Submitted for internal review",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  CUSTOMER: "Customer",
  OPERATIONS: "Operations",
  COMPLIANCE: "Compliance",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super administrator",
};

export const OWNERSHIP_TYPE_LABELS: Record<(typeof OWNERSHIP_TYPES)[number], string> = {
  sole: "Sole",
  joint: "Joint",
  business: "Business",
  financed: "Financed",
  leased: "Leased",
  other: "Other",
};

export const TITLE_TRANSACTION_LABELS: Record<(typeof TITLE_TRANSACTION_TYPES)[number], string> = {
  title_transfer: "Title transfer",
  duplicate_title: "Duplicate title",
  correction: "Correction",
  lien_release: "Lien release",
  ownership_change: "Ownership change",
  private_party_sale: "Private party sale",
  dealer_sale: "Dealer sale",
  other: "Other",
};

export const TITLE_STEP_LABELS: Record<(typeof TITLE_STEPS)[number], string> = {
  vehicle: "Vehicle",
  ownership: "Ownership",
  title: "Title information",
  lien: "Lien information",
  documents: "Documents",
  review: "Review",
  submitted: "Submitted",
};

export const LIEN_STATUS_LABELS: Record<(typeof LIEN_STATUSES)[number], string> = {
  unknown: "Unknown",
  customer_reports_no_lien: "Customer reports no lien",
  customer_reports_lien: "Customer reports a lien",
  document_uploaded: "Document uploaded",
  under_review: "Under review",
  released: "Released",
  verified: "Verified",
};

export const DOCUMENT_TYPE_LABELS: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  title: "Title",
  registration: "Registration",
  bill_of_sale: "Bill of sale",
  lien_release: "Lien release",
  purchase_agreement: "Purchase agreement",
  odometer_disclosure: "Odometer disclosure",
  insurance_document: "Insurance document",
  supporting_document: "Supporting document",
  other: "Other",
};

export const REVIEW_ACTION_LABELS: Record<(typeof REVIEW_ACTIONS)[number], string> = {
  approved: "Approve section",
  info_requested: "Request more information",
  flagged: "Flag for compliance",
  rejected: "Reject information",
  assigned: "Assign case",
  reassigned: "Reassign case",
};
