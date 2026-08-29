import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { adminListUsers, adminOverview } from "@/server/services";

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(
            await withApiActor(request, async (actor) => {
              const overview = await adminOverview(actor);
              const users =
                actor.primaryRole === "ADMIN" || actor.primaryRole === "SUPER_ADMIN"
                  ? await adminListUsers(actor)
                  : [];
              return { overview, users };
            }),
          );
        } catch (error) {
          return handleApiError("api.admin", error);
        }
      },
    },
  },
});
