import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { adminListAudit } from "@/server/services";

export const Route = createFileRoute("/api/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(
            await withApiActor(request, async (actor) => ({ audit: await adminListAudit(actor) })),
          );
        } catch (error) {
          return handleApiError("api.audit", error);
        }
      },
    },
  },
});
