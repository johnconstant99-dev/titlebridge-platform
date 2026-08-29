import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { SessionGate } from "@/components/auth/session-gate";
import { InternalShell } from "@/components/layout/internal-shell";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";

export const Route = createFileRoute("/internal")({ component: InternalLayout });

function InternalLayout() {
  return (
    <SessionGate>
      <InternalGate />
    </SessionGate>
  );
}

function InternalGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { snapshot, isPending } = useSessionSnapshot();
  if (isPending || !snapshot) return <PageSkeleton />;
  if (!snapshot.profile?.onboardingCompleted) return <Navigate to="/onboarding" />;
  const isBootstrap = pathname === "/internal/bootstrap";
  if (!snapshot.canAccessInternal && !isBootstrap) {
    return <Navigate to="/app" />;
  }
  return (
    <InternalShell snapshot={snapshot}>
      <Outlet />
    </InternalShell>
  );
}
