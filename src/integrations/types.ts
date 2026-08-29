export type IntegrationEnvironment = "sandbox" | "staging" | "production";

export type ProviderType =
  | "identity"
  | "vin"
  | "vehicle_history"
  | "nmvtis"
  | "elt"
  | "evr"
  | "ert"
  | "state_dmv"
  | "payments"
  | "esignature"
  | "storage";

export type AdapterFailureCode = "PROVIDER_NOT_CONFIGURED" | "NOT_IMPLEMENTED";

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AdapterFailureCode; message: string };

export type IntegrationAdapter<TRequest = Record<string, never>, TResponse = never> = {
  providerType: ProviderType;
  providerName: string;
  environment: IntegrationEnvironment;
  configured: boolean;
  execute: (request: TRequest) => Promise<AdapterResult<TResponse>>;
};

export const NOT_CONFIGURED_MESSAGE = "Provider not configured";

export function notConfigured<T>(providerName: string): AdapterResult<T> {
  return {
    ok: false,
    code: "PROVIDER_NOT_CONFIGURED",
    message: `${NOT_CONFIGURED_MESSAGE}: ${providerName}`,
  };
}
