import type {
  AuditLog,
  CaseNote,
  CaseRecord,
  CaseStatus,
  CaseType,
  IntegrationProvider,
  NotificationPreference,
  NotificationRecord,
  Organization,
  OrganizationType,
  Profile,
  Role,
  StateConfiguration,
} from "@/lib/types";

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    phone: row.phone == null ? null : String(row.phone),
    state: row.state == null ? null : String(row.state),
    notificationPreference: (row.notification_preference as NotificationPreference) ?? "email",
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapCase(row: Record<string, unknown>): CaseRecord {
  return {
    id: String(row.id),
    caseNumber: String(row.case_number),
    customerId: String(row.customer_id),
    organizationId: row.organization_id == null ? null : String(row.organization_id),
    caseType: row.case_type as CaseType,
    status: row.status as CaseStatus,
    jurisdiction: row.jurisdiction == null ? null : String(row.jurisdiction),
    assignedTo: row.assigned_to == null ? null : String(row.assigned_to),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapNote(row: Record<string, unknown>): CaseNote {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    authorId: String(row.author_id),
    note: String(row.note),
    visibility: row.visibility === "customer" ? "customer" : "internal",
    createdAt: toIso(row.created_at),
  };
}

export function mapNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: String(row.type),
    title: String(row.title),
    message: String(row.message),
    readAt: row.read_at == null ? null : toIso(row.read_at),
    createdAt: toIso(row.created_at),
  };
}

export function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    organizationName: String(row.organization_name),
    organizationType: row.organization_type as OrganizationType,
    status: row.status as Organization["status"],
    isDevelopmentData: Boolean(row.is_development_data),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapAudit(row: Record<string, unknown>): AuditLog {
  const metadata: Record<string, string | number | boolean | null> = {};
  if (row.metadata && typeof row.metadata === "object") {
    for (const [key, value] of Object.entries(row.metadata as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
        metadata[key] = value;
      }
    }
  }
  return {
    id: String(row.id),
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    actorRole: row.actor_role == null ? null : String(row.actor_role),
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: row.resource_id == null ? null : String(row.resource_id),
    metadata,
    timestamp: toIso(row.timestamp),
  };
}

export function mapState(row: Record<string, unknown>): StateConfiguration {
  return {
    id: String(row.id),
    stateCode: String(row.state_code),
    stateName: String(row.state_name),
    digitalTitleSupported: row.digital_title_supported as StateConfiguration["digitalTitleSupported"],
    electronicRegistrationSupported:
      row.electronic_registration_supported as StateConfiguration["electronicRegistrationSupported"],
    eltSupported: row.elt_supported as StateConfiguration["eltSupported"],
    providerRequired: Boolean(row.provider_required),
    configurationStatus: row.configuration_status as StateConfiguration["configurationStatus"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapProvider(row: Record<string, unknown>): IntegrationProvider {
  return {
    id: String(row.id),
    providerType: String(row.provider_type),
    providerName: String(row.provider_name),
    environment: row.environment as IntegrationProvider["environment"],
    status: row.status as IntegrationProvider["status"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapRoles(rows: { role: string }[]): Role[] {
  return rows.map((r) => r.role as Role);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}
