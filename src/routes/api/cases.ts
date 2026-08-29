import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { createDraftCase, listOwnCases } from "@/server/services";

export const Route = createFileRoute("/api/cases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(await withApiActor(request, async (actor) => ({ cases: await listOwnCases(actor) })));
        } catch (error) {
          return handleApiError("api.cases.get", error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          return json(
            await withApiActor(request, async (actor) => ({ case: await createDraftCase(actor, body) })),
            201,
          );
        } catch (error) {
          return handleApiError("api.cases.post", error);
        }
      },
    },
  },
});
