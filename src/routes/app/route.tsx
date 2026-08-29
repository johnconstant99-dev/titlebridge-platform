import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SessionGate } from "@/components/auth/session-gate";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  return (
    <SessionGate>
      <AppGate />
    </SessionGate>
  );
}

function AppGate() {
  const { snapshot, isPending } = useSessionSnapshot();
  if (isPending || !snapshot) return <PageSkeleton />;
  if (!snapshot.profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" />;
  }
  return (
    <AppShell snapshot={snapshot}>
      <Outlet />
    </AppShell>
  );
}
