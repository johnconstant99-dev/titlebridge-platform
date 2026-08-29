import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminSettingsFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/settings")({ component: SettingsPage });

function SettingsPage() {
  const query = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminSettingsFn() });
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Permitted application settings. Secrets and broker credentials are never shown here."
      />
      <Card>
        {query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {(query.data ?? []).map((row) => (
              <li key={row.key} className="rounded-md bg-stone px-3 py-3">
                <p className="font-medium">{row.key}</p>
                <pre className="mt-1 overflow-x-auto text-xs text-muted">
                  {row.value}
                </pre>
              </li>
            ))}
            {(query.data ?? []).length === 0 ? (
              <p className="text-muted">No settings stored yet.</p>
            ) : null}
          </ul>
        )}
      </Card>
    </div>
  );
}
