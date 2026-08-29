import { createFileRoute } from "@tanstack/react-router";
import { withRlsContext } from "@/lib/db";
import { handleApiError } from "@/server/http";
import { applySecurityHeaders } from "@/security/headers";
import { writeAudit } from "@/server/audit";

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          if (!token) {
            return new Response("Missing token", { status: 401 });
          }
          const { peekDocumentToken, readDocumentFromToken } = await import("@/server/vault");
          const { loadActor } = await import("@/server/actor");
          const claims = await peekDocumentToken(token);
          const actor = await loadActor(claims.uid);
          const file = await withRlsContext(
            { userId: actor.userId, role: actor.primaryRole },
            async () => {
              const document = await readDocumentFromToken(token);
              await writeAudit({
                actorUserId: actor.userId,
                actorRole: actor.primaryRole,
                action: "document.downloaded",
                resourceType: "document",
                resourceId: document.documentId,
              });
              return document;
            },
          );
          const headers = new Headers({
            "Content-Type": file.contentType,
            "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          });
          applySecurityHeaders(headers);
          return new Response(Buffer.from(file.bytes), { status: 200, headers });
        } catch (error) {
          return handleApiError("api.files.get", error);
        }
      },
    },
  },
});
