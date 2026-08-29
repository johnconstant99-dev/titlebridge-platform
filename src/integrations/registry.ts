import type { IntegrationAdapter, IntegrationEnvironment, ProviderType } from "./types.ts";
import { createPlaceholderAdapter } from "./adapter.ts";

const TYPES: { type: ProviderType; name: string }[] = [
  { type: "identity", name: "Identity verification" },
  { type: "vin", name: "VIN decode" },
  { type: "vehicle_history", name: "Vehicle history" },
  { type: "nmvtis", name: "NMVTIS" },
  { type: "elt", name: "Electronic lien and title" },
  { type: "evr", name: "Electronic vehicle registration" },
  { type: "ert", name: "Electronic registration and title" },
  { type: "state_dmv", name: "State motor-vehicle system" },
  { type: "payments", name: "Payments" },
  { type: "esignature", name: "Electronic signature" },
  { type: "storage", name: "Secure object storage" },
];

const ENVIRONMENTS: IntegrationEnvironment[] = ["sandbox", "staging", "production"];

export function listAdapters(): IntegrationAdapter[] {
  return TYPES.flatMap((item) =>
    ENVIRONMENTS.map((environment) =>
      createPlaceholderAdapter(item.type, `${item.name} (${environment})`, environment),
    ),
  );
}

export function catalogEntries() {
  return TYPES.map((item) => ({
    providerType: item.type,
    providerName: item.name,
    environments: ENVIRONMENTS,
    status: "not_configured" as const,
    message: "Provider not configured",
  }));
}
