import { US_STATES } from "@/lib/constants";
import { dbSource, getServiceSql } from "@/lib/db";
import { allowDevelopmentSeed } from "@/lib/runtime-env";
import { catalogEntries } from "@/integrations/registry";
import { newId } from "./ids";

const globalRef = globalThis as typeof globalThis & {
  __tbBootstrapPromise__?: Promise<void>;
};

function isDevDataEnabled() {
  return allowDevelopmentSeed({ dbSource });
}

export function developmentDataEnabled() {
  return isDevDataEnabled();
}

export async function ensureFoundationData(): Promise<void> {
  globalRef.__tbBootstrapPromise__ ??= (async () => {
    const sql = await getServiceSql();

    const existingStates = await sql.query<{ count: number }>(
      "select count(*)::int as count from state_configurations",
    );
    if ((existingStates[0]?.count ?? 0) === 0) {
      for (const state of US_STATES) {
        await sql.query(
          `insert into state_configurations (
            id, state_code, state_name,
            digital_title_supported, electronic_registration_supported, elt_supported,
            provider_required, configuration_status
          ) values ($1,$2,$3,'unverified','unverified','unverified', true, 'configuration_required')
          on conflict (state_code) do nothing`,
          [newId("st"), state.code, state.name],
        );
      }
    }

    const existingProviders = await sql.query<{ count: number }>(
      "select count(*)::int as count from integration_providers",
    );
    if ((existingProviders[0]?.count ?? 0) === 0) {
      for (const entry of catalogEntries()) {
        for (const environment of entry.environments) {
          await sql.query(
            `insert into integration_providers (id, provider_type, provider_name, environment, status)
             values ($1,$2,$3,$4,'not_configured')
             on conflict (provider_type, environment) do nothing`,
            [newId("int"), entry.providerType, entry.providerName, environment],
          );
        }
      }
    }

    const settings = await sql.query<{ key: string }>(
      "select key from platform_settings where key = 'seed_mode'",
    );
    if (settings.length === 0) {
      await sql.query(
        `insert into platform_settings (key, value) values ('seed_mode', $1::jsonb)
         on conflict (key) do nothing`,
        [JSON.stringify({ enabled: isDevDataEnabled() })],
      );
    }

    if (isDevDataEnabled()) {
      const orgs = await sql.query<{ count: number }>(
        "select count(*)::int as count from organizations where is_development_data = true",
      );
      if ((orgs[0]?.count ?? 0) === 0) {
        const fictional = [
          {
            name: "Northwind Motors (Fictional)",
            type: "dealership",
          },
          {
            name: "Cedar Ridge Capital (Fictional)",
            type: "lender",
          },
          {
            name: "Harbor Fleet Services (Fictional)",
            type: "fleet",
          },
        ];
        for (const org of fictional) {
          await sql.query(
            `insert into organizations (id, organization_name, organization_type, status, is_development_data)
             values ($1,$2,$3,'pending', true)`,
            [newId("org"), org.name, org.type],
          );
        }
      }
    }
  })().catch((err) => {
    globalRef.__tbBootstrapPromise__ = undefined;
    throw err;
  });
  return globalRef.__tbBootstrapPromise__;
}
