import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PageSkeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <PageSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
