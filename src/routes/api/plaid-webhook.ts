import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json } from "@/server/http";
import { applyPlaidIdentityWebhook } from "@/server/identity";

export const Route = createFileRoute("/api/plaid-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as Record<string, unknown>;
          const webhookType = typeof payload.webhook_type === "string" ? payload.webhook_type : "";
          if (webhookType && webhookType !== "IDENTITY_VERIFICATION") {
            return json({ ok: true, ignored: webhookType });
          }
          return json(await applyPlaidIdentityWebhook(payload));
        } catch (error) {
          return handleApiError("api.plaid-webhook", error);
        }
      },
    },
  },
});
