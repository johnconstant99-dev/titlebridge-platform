import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json } from "@/server/http";
import { ensureFoundationData } from "@/server/bootstrap";
import { listStates } from "@/server/services";

export const Route = createFileRoute("/api/states")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await ensureFoundationData();
          return json({ states: await listStates() });
        } catch (error) {
          return handleApiError("api.states", error);
        }
      },
    },
  },
});
