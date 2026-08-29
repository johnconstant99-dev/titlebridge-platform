import { notConfigured, type IntegrationAdapter, type IntegrationEnvironment, type ProviderType } from "./types.ts";

export function createPlaceholderAdapter(
  providerType: ProviderType,
  providerName: string,
  environment: IntegrationEnvironment = "sandbox",
): IntegrationAdapter {
  return {
    providerType,
    providerName,
    environment,
    configured: false,
    async execute() {
      return notConfigured(providerName);
    },
  };
}
