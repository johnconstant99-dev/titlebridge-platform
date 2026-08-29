import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listConsentsFn } from "@/fn/session";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card } from "@/components/ui/card";
import { FUTURE_AUTH_METHODS, FUTURE_AUTH_STATUS } from "@/security/future-auth";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/app/security")({ component: SecurityPage });

function SecurityPage() {
  const { snapshot } = useSessionSnapshot();
  const consents = useQuery({ queryKey: ["consents"], queryFn: () => listConsentsFn() });

  return (
    <div>
      <PageHeader
        title="Security"
        description="Session, consent, and verification status for this account."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Authentication</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between gap-3">
              <span>Email</span>
              <span>{snapshot?.email ?? "—"}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Email verification</span>
              <Badge>Architecture ready · delivery later</Badge>
            </li>
            <li className="flex justify-between gap-3">
              <span>Password reset</span>
              <Badge>Architecture ready · delivery later</Badge>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Coming later</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {FUTURE_AUTH_METHODS.map((method) => (
              <li key={method} className="flex justify-between gap-3">
                <span className="capitalize">{method.replaceAll("_", " ")}</span>
                <Badge>{FUTURE_AUTH_STATUS.replaceAll("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl">Consent records</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Version</th>
                  <th className="py-2 font-medium">Accepted</th>
                </tr>
              </thead>
              <tbody>
                {(consents.data ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-3">{row.consentType.replaceAll("_", " ")}</td>
                    <td className="font-mono">{row.consentVersion}</td>
                    <td>{formatDateTime(row.acceptedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(consents.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted">No consent records yet.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
