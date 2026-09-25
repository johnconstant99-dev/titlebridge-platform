import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, json } from "@/server/http";
import { applyPlaidIdentityWebhook } from "@/server/identity";
import { verifyPlaidWebhookSignature } from "@/integrations/plaid/webhook";

export const Route = createFileRoute("/api/plaid-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const signature =
            request.headers.get("plaid-verification") ??
            request.headers.get("x-plaid-signature") ??
            request.headers.get("Plaid-Verification");
          const verified = verifyPlaidWebhookSignature({
            rawBody,
            signatureHeader: signature,
          });
          if (!verified.ok) {
            return json({ ok: false, message: verified.message }, 401);
          }
          const payload = JSON.parse(rawBody) as Record<string, unknown>;
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
