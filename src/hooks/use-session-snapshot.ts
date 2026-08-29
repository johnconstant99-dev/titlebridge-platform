import { useQuery } from "@tanstack/react-query";
import { getSessionSnapshot } from "@/fn/session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function useSessionSnapshot() {
  const { user, isPending } = useCurrentUserState();
  const query = useQuery({
    queryKey: ["session-snapshot", user?.id],
    queryFn: () => getSessionSnapshot(),
    enabled: Boolean(user),
  });
  return {
    isPending: isPending || (Boolean(user) && query.isPending),
    user,
    snapshot: query.data ?? null,
    error: query.error,
    refetch: query.refetch,
  };
}
