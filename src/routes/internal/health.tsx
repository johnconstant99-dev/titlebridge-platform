import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminHealthFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/health")({ component: HealthPage });

function HealthPage() {
  const query = useQuery({ queryKey: ["admin-health"], queryFn: () => adminHealthFn() });
  const data = query.data;
  return (
    <div>
      <PageHeader title="System health" description="Connectivity and configuration status for this environment." />
      {query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Database</p>
            <div className="mt-2">
              <Badge tone="success">{data?.database ?? "checking"}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">{data?.checkedAt}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Email / storage</p>
            <p className="mt-2 text-sm">Email delivery: {data?.emailDelivery}</p>
            <p className="mt-1 text-sm">Object storage: {data?.objectStorage}</p>
          </Card>
          <Card className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted">Adapters</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data?.integrations.map((item) => (
                <Badge key={item.type} tone="warning">
                  {item.type.replaceAll("_", " ")}: not configured
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
