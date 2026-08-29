import {
  ASSIGNABLE_ROLES,
  OPERATIONS_STATUS_TRANSITIONS,
  STAFF_ROLES,
} from "./constants.ts";
import type { AssignableRole, CaseStatus, ReviewAction, ReviewSection, Role } from "./types.ts";

export const PERMISSIONS = {
  "internal:access": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "case:read:own": ["CUSTOMER", "OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "case:read:any": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "case:create:own": ["CUSTOMER", "ADMIN", "SUPER_ADMIN"],
  "case:status:update": ["OPERATIONS", "ADMIN", "SUPER_ADMIN"],
  "case:note:internal": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "case:note:customer": ["CUSTOMER", "OPERATIONS", "ADMIN", "SUPER_ADMIN"],
  "case:assign": ["OPERATIONS", "ADMIN", "SUPER_ADMIN"],
  "vehicle:read:own": ["CUSTOMER", "OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "vehicle:read:any": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "vehicle:write:own": ["CUSTOMER", "ADMIN", "SUPER_ADMIN"],
  "document:read:own": ["CUSTOMER", "OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "document:read:any": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "document:write:own": ["CUSTOMER", "ADMIN", "SUPER_ADMIN"],
  "review:act": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "user:manage": ["ADMIN", "SUPER_ADMIN"],
  "role:assign": ["ADMIN", "SUPER_ADMIN"],
  "org:manage": ["ADMIN", "SUPER_ADMIN"],
  "org:read": ["OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "compliance:review": ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "audit:read": ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "settings:manage": ["ADMIN", "SUPER_ADMIN"],
  "integrations:read": ["ADMIN", "SUPER_ADMIN"],
  "states:read": ["CUSTOMER", "OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
  "states:configure": ["ADMIN", "SUPER_ADMIN"],
  "system:health": ["ADMIN", "SUPER_ADMIN"],
  "notification:own": ["CUSTOMER", "OPERATIONS", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasRole(roles: readonly Role[], role: Role): boolean {
  return roles.includes(role);
}

export function isStaff(roles: readonly Role[]): boolean {
  return roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
}

export function primaryRole(roles: readonly Role[]): Role {
  const rank: Role[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "COMPLIANCE",
    "OPERATIONS",
    "CUSTOMER",
  ];
  for (const role of rank) {
    if (roles.includes(role)) return role;
  }
  return "CUSTOMER";
}

export function can(roles: readonly Role[], permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly Role[];
  return roles.some((role) => allowed.includes(role));
}

export function canAssignRole(actorRoles: readonly Role[], target: Role): boolean {
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(target)) return false;
  if (target === "ADMIN") return hasRole(actorRoles, "SUPER_ADMIN") || hasRole(actorRoles, "ADMIN");
  return can(actorRoles, "role:assign");
}

export function assertNeverAssignSuperAdmin(target: string): void {
  if (target === "SUPER_ADMIN") {
    throw new Error("SUPER_ADMIN is reserved and cannot be assigned");
  }
}

export function canAccessCase(input: {
  actorId: string;
  actorRoles: readonly Role[];
  customerId: string;
}): boolean {
  if (input.customerId === input.actorId) return true;
  return can(input.actorRoles, "case:read:any");
}

export function canAccessOwned(input: {
  actorId: string;
  actorRoles: readonly Role[];
  ownerUserId: string;
  staffPermission?: Permission;
}): boolean {
  if (input.ownerUserId === input.actorId) return true;
  return can(input.actorRoles, input.staffPermission ?? "vehicle:read:any");
}

export function canSeeInternalNote(actorRoles: readonly Role[]): boolean {
  return can(actorRoles, "case:note:internal");
}

export function allowedStatusChange(
  actorRoles: readonly Role[],
  next: CaseStatus,
): boolean {
  if (hasRole(actorRoles, "ADMIN") || hasRole(actorRoles, "SUPER_ADMIN")) {
    return true;
  }
  if (hasRole(actorRoles, "OPERATIONS")) {
    return (OPERATIONS_STATUS_TRANSITIONS as readonly string[]).includes(next);
  }
  return false;
}

export function nextCaseStatusForReview(input: {
  actorRoles: readonly Role[];
  action: ReviewAction;
  section: ReviewSection;
  currentStatus: CaseStatus;
}): CaseStatus | null {
  if (input.action === "info_requested") return "awaiting_customer";
  if (input.action === "rejected") return "rejected";
  if (input.action === "assigned" || input.action === "reassigned") return "under_review";
  if (input.action === "approved" && input.section === "case") {
    if (allowedStatusChange(input.actorRoles, "completed")) return "completed";
    if (allowedStatusChange(input.actorRoles, "ready_for_submission")) {
      return "ready_for_submission";
    }
    return null;
  }
  if (input.action === "approved" && input.currentStatus === "draft") return "under_review";
  return null;
}

export function publicProfileView(input: {
  actorId: string;
  actorRoles: readonly Role[];
  profileUserId: string;
}): boolean {
  if (input.actorId === input.profileUserId) return true;
  return isStaff(input.actorRoles);
}

export type AssignableRoleCheck = {
  ok: boolean;
  reason?: string;
};

export function validateRoleAssignment(
  actorRoles: readonly Role[],
  targetRole: string,
): AssignableRoleCheck {
  if (targetRole === "SUPER_ADMIN") {
    return { ok: false, reason: "SUPER_ADMIN is reserved and is not assignable" };
  }
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(targetRole)) {
    return { ok: false, reason: "Unknown role" };
  }
  if (!can(actorRoles, "role:assign")) {
    return { ok: false, reason: "Not permitted to assign roles" };
  }
  return { ok: true };
}

export function asAssignableRole(value: string): AssignableRole {
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(value)) {
    throw new Error("Invalid role");
  }
  return value as AssignableRole;
}
