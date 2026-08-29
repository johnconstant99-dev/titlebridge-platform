import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminOverviewFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/")({ component: InternalOverview });

function InternalOverview() {
  const query = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverviewFn() });
  const data = query.data;
  const metrics = [
    { label: "Total users", value: data?.totalUsers ?? "—" },
    { label: "Vehicles", value: data?.vehicles ?? "—" },
    { label: "Open cases", value: data?.openCases ?? "—" },
    { label: "Pending reviews", value: data?.pendingReviews ?? "—" },
    { label: "Organizations", value: data?.organizations ?? "—" },
    { label: "System events (24h)", value: data?.systemEvents24h ?? "—" },
  ];
  return (
    <div>
      <PageHeader
        title="Operations overview"
        description="Live counts from this environment. No simulated production statistics."
      />
      {query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((item) => (
            <Card key={item.label}>
              <p className="text-xs uppercase tracking-wide text-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl tabular-nums">{item.value}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
