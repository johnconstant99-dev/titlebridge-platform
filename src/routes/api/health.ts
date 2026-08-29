import { createFileRoute } from "@tanstack/react-router";
import { PHASE_LABEL } from "@/lib/constants";
import { json } from "@/server/http";
import { ensureFoundationData, developmentDataEnabled } from "@/server/bootstrap";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        await ensureFoundationData();
        return json({
          ok: true,
          service: "titlebridge",
          phase: PHASE_LABEL,
          developmentData: developmentDataEnabled(),
        });
      },
    },
  },
});