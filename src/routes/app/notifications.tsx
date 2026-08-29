import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotificationsFn, markNotificationReadFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => listNotificationsFn() });
  const mark = useMutation({
    mutationFn: (id: string) => markNotificationReadFn({ data: { id } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div>
      <PageHeader title="Notifications" description="Account activity that belongs only to you." />
      <div className="space-y-3">
        {(query.data ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No notifications yet.</p>
          </Card>
        ) : (
          query.data?.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.message}</p>
                <p className="mt-2 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
              </div>
              {!item.readAt ? (
                <Button size="sm" variant="secondary" onClick={() => mark.mutate(item.id)}>
                  Mark read
                </Button>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
