import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { bootstrapStatusFn, listCasesFn, listNotificationsFn, listVehiclesFn } from "@/fn/session";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { IDENTITY_NOTICE } from "@/lib/constants";
import { displayName } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
  const { snapshot } = useSessionSnapshot();
  const cases = useQuery({ queryKey: ["cases"], queryFn: () => listCasesFn() });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => listVehiclesFn() });
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => listNotificationsFn() });
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootstrapStatusFn() });
  const profile = snapshot?.profile;
  const name = displayName(profile?.firstName ?? "", profile?.lastName ?? "", snapshot?.email);
  const unread = notes.data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Hello, ${name}`}
        description="Your vehicles, documents, and title cases. Submissions go to TitleBridge internal review only — never to a motor-vehicle department."
      />
      <div className="mb-6 rounded-lg border border-border bg-stone px-4 py-3 text-sm text-fg">
        {IDENTITY_NOTICE}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Vehicles</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{vehicles.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Cases</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{cases.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Unread notices</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{unread}</p>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Recent cases</h2>
              <p className="mt-1 text-sm text-muted">Internal review only — not submitted to any state.</p>
            </div>
            <Link to="/app/cases">
              <Button size="sm" variant="secondary">View</Button>
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {(cases.data ?? []).slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-stone px-3 py-3 text-sm">
                <span className="font-mono">{item.caseNumber}</span>
                <Badge>{item.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
            {(cases.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">No active cases.</p>
            ) : null}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Account status</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span>Onboarding</span><Badge tone="success">Complete</Badge></li>
            <li className="flex justify-between"><span>Identity verification</span><Badge>Later phase</Badge></li>
            <li className="flex justify-between"><span>Role</span><Badge tone="pine">{snapshot?.roles.join(", ")}</Badge></li>
          </ul>
          {snapshot?.canAccessInternal ? (
            <Link to="/internal" className="mt-4 inline-block text-sm text-steel underline">
              Open internal console
            </Link>
          ) : null}
          {bootstrap.data?.developmentData && !bootstrap.data.superAdminExists ? (
            <div className="mt-6 rounded-md bg-stone p-4">
              <p className="text-sm">Development Data mode has no super administrator yet.</p>
              <Link to="/internal/bootstrap" className="mt-2 inline-block text-sm text-steel underline">
                Open platform bootstrap
              </Link>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
