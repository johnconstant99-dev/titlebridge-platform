import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { adminListOrganizations } from "@/server/services";

export const Route = createFileRoute("/api/organizations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(
            await withApiActor(request, async (actor) => ({
              organizations: await adminListOrganizations(actor),
            })),
          );
        } catch (error) {
          return handleApiError("api.organizations", error);
        }
      },
    },
  },
});
