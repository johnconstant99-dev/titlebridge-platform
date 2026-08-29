import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminComplianceFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/compliance")({
  component: CompliancePage,
});

function CompliancePage() {
  const query = useQuery({
    queryKey: ["admin-compliance"],
    queryFn: () => adminComplianceFn(),
  });
  const data = query.data;
  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Identity verification, risk flags, consent, and compliance events. Identity verification is not live in Phase 1B Private Beta."
      />
      {query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl">Identity verification</h2>
            {(data?.identityRecords.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted">No verification records yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data?.identityRecords.map((row) => (
                  <li key={row.id} className="rounded-md bg-stone px-3 py-2">
                    {row.status} · {row.provider}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-xl">Risk flags</h2>
            {(data?.riskFlags.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted">No risk flags.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data?.riskFlags.map((row) => (
                  <li key={row.id} className="rounded-md bg-stone px-3 py-2">
                    {row.flagType} · {row.severity}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-xl">Consent history</h2>
            {(data?.consents.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted">No consent records.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data?.consents.map((row) => (
                  <li key={row.id} className="rounded-md bg-stone px-3 py-2">
                    {row.consentType} v{row.consentVersion}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-xl">Compliance events</h2>
            {(data?.events.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-muted">No compliance events.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data?.events.map((row) => (
                  <li key={row.id} className="rounded-md bg-stone px-3 py-2">
                    {row.summary}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
