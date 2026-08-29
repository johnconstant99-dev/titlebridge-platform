import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { listIntegrations } from "@/server/services";

export const Route = createFileRoute("/api/integrations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(await withApiActor(request, async (actor) => listIntegrations(actor)));
        } catch (error) {
          return handleApiError("api.integrations", error);
        }
      },
    },
  },
});
