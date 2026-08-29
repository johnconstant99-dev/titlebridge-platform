import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminAuditFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/internal/audit")({ component: AuditPage });

function AuditPage() {
  const query = useQuery({ queryKey: ["admin-audit"], queryFn: () => adminAuditFn() });
  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Append-only history. Passwords, tokens, and secrets are never recorded."
      />
      <Card>
        {query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Time</th>
                  <th className="py-2 font-medium">Action</th>
                  <th className="py-2 font-medium">Resource</th>
                  <th className="py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 text-muted">{formatDateTime(row.timestamp)}</td>
                    <td className="font-mono text-xs">{row.action}</td>
                    <td>
                      {row.resourceType}
                      {row.resourceId ? ` · ${row.resourceId.slice(0, 12)}` : ""}
                    </td>
                    <td>{row.actorRole ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
