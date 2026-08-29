import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { bootstrapStatusFn, bootstrapSuperAdminFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/bootstrap")({
  component: BootstrapPage,
});

function BootstrapPage() {
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootstrapStatusFn() });
  const claim = useMutation({
    mutationFn: () => bootstrapSuperAdminFn(),
    onSuccess: async () => {
      await navigate({ to: "/internal" });
      window.location.reload();
    },
  });

  return (
    <div>
      <PageHeader
        title="Platform bootstrap"
        description="Development Data only. Claims SUPER_ADMIN when none exists. Disabled in production."
      />
      <Card className="max-w-xl">
        {!status.data?.developmentData ? (
          <p className="text-sm text-muted">
            Bootstrap is disabled outside Development Data mode.
          </p>
        ) : status.data.superAdminExists ? (
          <p className="text-sm">A super administrator already exists in this environment.</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              This action is audited. It exists so the first operator in a local or
              preview database can reach the internal console. It cannot run when a
              production database is attached.
            </p>
            <Button className="mt-4" onClick={() => claim.mutate()} disabled={claim.isPending}>
              {claim.isPending ? "Claiming…" : "Claim super administrator"}
            </Button>
            {claim.error ? (
              <p className="mt-3 text-sm text-danger">
                {claim.error instanceof Error ? claim.error.message : "Bootstrap failed"}
              </p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
