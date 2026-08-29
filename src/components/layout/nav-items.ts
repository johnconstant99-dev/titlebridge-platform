import type { Permission } from "@/lib/rbac";

export const CUSTOMER_NAV = [
  { to: "/app", label: "Overview", icon: "layout" },
  { to: "/app/vehicles", label: "My Vehicles", icon: "car" },
  { to: "/app/cases", label: "My Cases", icon: "folder" },
  { to: "/app/documents", label: "Documents", icon: "file" },
  { to: "/app/notifications", label: "Notifications", icon: "bell" },
  { to: "/app/profile", label: "Profile", icon: "user" },
  { to: "/app/security", label: "Security", icon: "shield" },
] as const;

export const INTERNAL_NAV: {
  to: string;
  label: string;
  permission: Permission;
}[] = [
  { to: "/internal", label: "Overview", permission: "internal:access" },
  { to: "/internal/users", label: "Users", permission: "user:manage" },
  { to: "/internal/organizations", label: "Organizations", permission: "org:read" },
  { to: "/internal/cases", label: "Cases", permission: "case:read:any" },
  { to: "/internal/review", label: "Review", permission: "review:act" },
  { to: "/internal/vehicles", label: "Vehicles", permission: "vehicle:read:any" },
  { to: "/internal/compliance", label: "Compliance", permission: "compliance:review" },
  { to: "/internal/integrations", label: "Integrations", permission: "integrations:read" },
  { to: "/internal/states", label: "State Configuration", permission: "internal:access" },
  { to: "/internal/audit", label: "Audit Logs", permission: "audit:read" },
  { to: "/internal/health", label: "System Health", permission: "system:health" },
  { to: "/internal/settings", label: "Settings", permission: "settings:manage" },
];
