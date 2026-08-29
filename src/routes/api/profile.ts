import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json, withApiActor } from "@/server/http";
import { loadSessionSnapshot } from "@/server/actor";
import { updateProfile } from "@/server/services";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return json(
            await withApiActor(request, async (actor) => {
              const snapshot = await loadSessionSnapshot(actor, null);
              return { profile: snapshot.profile, roles: snapshot.roles };
            }),
          );
        } catch (error) {
          return handleApiError("api.profile.get", error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          return json(
            await withApiActor(request, async (actor) => {
              const profile = await updateProfile(actor, body);
              return { profile };
            }),
          );
        } catch (error) {
          return handleApiError("api.profile.post", error);
        }
      },
    },
  },
});
