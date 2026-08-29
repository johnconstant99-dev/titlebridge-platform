import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { listNotifications } from "@/server/services";

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(
            await withApiActor(request, async (actor) => ({
              notifications: await listNotifications(actor),
            })),
          );
        } catch (error) {
          return handleApiError("api.notifications", error);
        }
      },
    },
  },
});
