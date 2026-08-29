import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminIntegrationsFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const query = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: () => adminIntegrationsFn(),
  });
  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Placeholder adapters for identity, VIN, vehicle history, NMVTIS, ELT, EVR, state systems, payments, e-signature, and storage. Secrets are never stored in this table."
      />
      {query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data?.catalog.map((item) => (
            <Card key={item.providerType}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{item.providerName}</h2>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                    {item.providerType.replaceAll("_", " ")}
                  </p>
                </div>
                <Badge tone="warning">Provider not configured</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">
                Environments: {item.environments.join(", ")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
