import type {
  ASSIGNABLE_ROLES,
  CASE_STATUSES,
  CASE_TYPES,
  DOCUMENT_TYPES,
  LIEN_STATUSES,
  NOTIFICATION_PREFERENCES,
  ORGANIZATION_TYPES,
  OWNERSHIP_TYPES,
  REVIEW_ACTIONS,
  REVIEW_SECTIONS,
  ROLES,
  STAFF_ROLES,
  TITLE_STEPS,
  TITLE_TRANSACTION_TYPES,
} from "./constants.ts";

export type Role = (typeof ROLES)[number];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type CaseType = (typeof CASE_TYPES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
export type NotificationPreference = (typeof NOTIFICATION_PREFERENCES)[number];
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];
export type TitleTransactionType = (typeof TITLE_TRANSACTION_TYPES)[number];
export type TitleStep = (typeof TITLE_STEPS)[number];
export type LienStatus = (typeof LIEN_STATUSES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type ReviewSection = (typeof REVIEW_SECTIONS)[number];
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export type Profile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  state: string | null;
  notificationPreference: NotificationPreference;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CaseRecord = {
  id: string;
  caseNumber: string;
  customerId: string;
  organizationId: string | null;
  caseType: CaseType;
  status: CaseStatus;
  jurisdiction: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseNote = {
  id: string;
  caseId: string;
  authorId: string;
  note: string;
  visibility: "internal" | "customer";
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type Organization = {
  id: string;
  organizationName: string;
  organizationType: OrganizationType;
  status: "active" | "inactive" | "pending" | "suspended";
  isDevelopmentData: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  timestamp: string;
};

export type ConsentRecord = {
  id: string;
  userId: string;
  consentType: string;
  consentVersion: string;
  accepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
};

export type StateConfiguration = {
  id: string;
  stateCode: string;
  stateName: string;
  digitalTitleSupported: "unverified" | "yes" | "no";
  electronicRegistrationSupported: "unverified" | "yes" | "no";
  eltSupported: "unverified" | "yes" | "no";
  providerRequired: boolean;
  configurationStatus: "configuration_required" | "unverified" | "sandbox" | "live";
  createdAt: string;
  updatedAt: string;
};

export type IntegrationProvider = {
  id: string;
  providerType: string;
  providerName: string;
  environment: "sandbox" | "staging" | "production";
  status: "not_configured" | "configured" | "disabled" | "error";
  createdAt: string;
  updatedAt: string;
};

export type VehicleRecord = {
  id: string;
  ownerUserId: string;
  displayName: string;
  vinMasked: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
  plateNumber: string | null;
  plateState: string | null;
  status: string;
  vinFormatValid: boolean;
  vinChecksumValid: boolean;
  verificationStatus: "unverified" | "format_validated" | "provider_verified";
  providerMessage: string | null;
  ownershipStatus: string;
  lienStatus: string;
  titleCaseStatus: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OwnershipRecord = {
  id: string;
  vehicleId: string;
  ownerUserId: string;
  ownershipType: OwnershipType;
  ownerName: string;
  acquisitionDate: string | null;
  purchasePrice: string | null;
  sellerName: string | null;
  verificationStatus: "self_reported" | "under_review" | "info_requested" | "rejected" | "verified";
  createdAt: string;
};

export type LienRecord = {
  id: string;
  vehicleId: string;
  ownerUserId: string;
  titleCaseId: string | null;
  status: LienStatus;
  lienholderName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OdometerRecord = {
  id: string;
  vehicleId: string;
  reading: number;
  unit: "miles" | "kilometers";
  source: string;
  recordedAt: string | null;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  ownerUserId: string;
  vehicleId: string | null;
  titleCaseId: string | null;
  caseId: string | null;
  documentType: DocumentType;
  fileName: string;
  contentType: string | null;
  byteSize: number | null;
  status: string;
  createdAt: string;
};

export type TitleCaseRecord = {
  id: string;
  caseId: string;
  caseNumber: string;
  vehicleId: string;
  customerId: string;
  transactionType: TitleTransactionType;
  currentStep: TitleStep;
  status: CaseStatus;
  titleState: string | null;
  titleNumberLast4: string | null;
  titleIssueDate: string | null;
  titleNotes: string | null;
  assignedTo: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TitleCaseReview = {
  id: string;
  titleCaseId: string;
  section: ReviewSection;
  action: ReviewAction;
  note: string | null;
  actorUserId: string;
  createdAt: string;
};

export type SessionSnapshot = {
  userId: string;
  email: string | null;
  displayName: string | null;
  roles: Role[];
  profile: Profile | null;
  developmentData: boolean;
  canAccessInternal: boolean;
};

export type PublicPlatformInfo = {
  appName: string;
  phase: string;
  developmentData: boolean;
  disclaimer: string;
};
