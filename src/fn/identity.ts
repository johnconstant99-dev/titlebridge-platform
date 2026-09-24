import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { toClientError } from "@/lib/errors";

async function asUser<T>(
  userId: string,
  fn: (actor: import("@/server/actor").Actor) => Promise<T>,
  email?: string | null,
): Promise<T> {
  const { runWithActor } = await import("@/server/actor");
  return runWithActor(userId, fn, email);
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    const client = toClientError(error);
    throw new Error(client.message);
  });
}

export const getIdentityVerificationFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { getOwnIdentityVerification } = await import("@/server/identity");
        return getOwnIdentityVerification(actor);
      }),
    ),
  );

export const startIdentityVerificationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { gaveConsent?: boolean }) => data)
  .handler(async ({ context, data }) =>
    wrap(async () => {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser();
      return asUser(
        context.userId,
        async (actor) => {
          const { startOwnIdentityVerification } = await import("@/server/identity");
          return startOwnIdentityVerification(actor, {
            gaveConsent: Boolean(data.gaveConsent),
            email: user?.email ?? null,
          });
        },
        user?.email ?? null,
      );
    }),
  );

export const refreshIdentityVerificationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { refreshOwnIdentityVerification } = await import("@/server/identity");
        return refreshOwnIdentityVerification(actor);
      }),
    ),
  );
