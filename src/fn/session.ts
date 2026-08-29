import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { PLATFORM_DISCLAIMER, PHASE_LABEL } from "@/lib/constants";
import { toClientError } from "@/lib/errors";

async function requestMeta() {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    return {
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    const client = toClientError(error);
    throw new Error(client.message);
  });
}

async function asUser<T>(
  userId: string,
  fn: (actor: import("@/server/actor").Actor) => Promise<T>,
  email?: string | null,
): Promise<T> {
  const { runWithActor } = await import("@/server/actor");
  return runWithActor(userId, fn, email);
}

export const getPublicInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureFoundationData, developmentDataEnabled } = await import("@/server/bootstrap");
  await ensureFoundationData();
  return {
    appName: "TitleBridge",
    phase: PHASE_LABEL,
    developmentData: developmentDataEnabled(),
    disclaimer: PLATFORM_DISCLAIMER,
  };
});

export const getSessionSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(async () => {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser();
      return asUser(
        context.userId,
        async (actor) => {
          const { loadSessionSnapshot } = await import("@/server/actor");
          return loadSessionSnapshot(actor, null);
        },
        user?.email ?? null,
      );
    }),
  );

export const recordLoginFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { recordAuthEvent } = await import("@/server/services");
        await recordAuthEvent(actor, "login");
        return { ok: true as const };
      }),
    ),
  );

export const recordLogoutFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { recordAuthEvent } = await import("@/server/services");
        await recordAuthEvent(actor, "logout");
        return { ok: true as const };
      }),
    ),
  );

export const completeOnboardingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { completeOnboarding } = await import("@/server/services");
        return completeOnboarding(actor, data, await requestMeta());
      }),
    ),
  );

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { updateProfile } = await import("@/server/services");
        return updateProfile(actor, data);
      }),
    ),
  );

export const listCasesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listOwnCases } = await import("@/server/services");
        return listOwnCases(actor);
      }),
    ),
  );

export const getCaseFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { caseId: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { getAccessibleCase } = await import("@/server/services");
        return getAccessibleCase(actor, data.caseId);
      }),
    ),
  );

export const createCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { createDraftCase } = await import("@/server/services");
        return createDraftCase(actor, data);
      }),
    ),
  );

export const addCaseNoteFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { addCaseNote } = await import("@/server/services");
        return addCaseNote(actor, data);
      }),
    ),
  );

export const updateCaseStatusFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { updateCaseStatus } = await import("@/server/services");
        return updateCaseStatus(actor, data);
      }),
    ),
  );

export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listNotifications } = await import("@/server/services");
        return listNotifications(actor);
      }),
    ),
  );

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { markNotificationRead } = await import("@/server/services");
        return markNotificationRead(actor, data.id);
      }),
    ),
  );

export const listVehiclesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listOwnVehicles } = await import("@/server/vehicles");
        return listOwnVehicles(actor);
      }),
    ),
  );

export const getVehicleFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { vehicleId: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { getAccessibleVehicle } = await import("@/server/vehicles");
        return getAccessibleVehicle(actor, data.vehicleId);
      }),
    ),
  );

export const createVehicleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { createVehicle } = await import("@/server/vehicles");
        return createVehicle(actor, data);
      }),
    ),
  );

export const saveOwnershipFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { saveOwnership } = await import("@/server/vehicles");
        return saveOwnership(actor, data);
      }),
    ),
  );

export const saveLienFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { saveLien } = await import("@/server/vehicles");
        return saveLien(actor, data);
      }),
    ),
  );

export const listDocumentsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listOwnDocuments } = await import("@/server/vehicles");
        return listOwnDocuments(actor);
      }),
    ),
  );

export const uploadDocumentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { uploadDocument } = await import("@/server/vehicles");
        return uploadDocument(actor, data);
      }),
    ),
  );

export const accessDocumentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { documentId: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { accessDocument } = await import("@/server/vehicles");
        return accessDocument(actor, data.documentId);
      }),
    ),
  );

export const validateVinFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { vin: string }) => data)
  .handler(async ({ data }) => {
    const { validateVin } = await import("@/lib/vin");
    const { decodeVin } = await import("@/integrations/vin");
    const result = validateVin(data.vin);
    const provider = await decodeVin();
    return {
      ...result,
      providerMessage: provider.ok ? "Connected" : provider.message,
    };
  });

export const listTitleCasesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listOwnTitleCases } = await import("@/server/titles");
        return listOwnTitleCases(actor);
      }),
    ),
  );

export const getTitleCaseFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { titleCaseId: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { getAccessibleTitleCase } = await import("@/server/titles");
        return getAccessibleTitleCase(actor, data.titleCaseId);
      }),
    ),
  );

export const createTitleCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { createTitleCase } = await import("@/server/titles");
        return createTitleCase(actor, data);
      }),
    ),
  );

export const saveTitleInfoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { saveTitleInfo } = await import("@/server/titles");
        return saveTitleInfo(actor, data);
      }),
    ),
  );

export const advanceTitleCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { titleCaseId: string; step: "ownership" | "title" | "lien" | "documents" | "review" }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { advanceTitleCase } = await import("@/server/titles");
        return advanceTitleCase(actor, data.titleCaseId, data.step);
      }),
    ),
  );

export const submitTitleCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { titleCaseId: string }) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { submitTitleCase } = await import("@/server/titles");
        return submitTitleCase(actor, data.titleCaseId);
      }),
    ),
  );

export const reviewTitleCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { reviewTitleCase } = await import("@/server/titles");
        return reviewTitleCase(actor, data);
      }),
    ),
  );

export const updateStaffLienFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { updateStaffLien } = await import("@/server/vehicles");
        return updateStaffLien(actor, data);
      }),
    ),
  );

export const adminVehiclesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListVehicles } = await import("@/server/vehicles");
        return adminListVehicles(actor);
      }),
    ),
  );

export const adminTitleCasesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListTitleCases } = await import("@/server/titles");
        return adminListTitleCases(actor);
      }),
    ),
  );

export const listConsentsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listConsents } = await import("@/server/services");
        return listConsents(actor);
      }),
    ),
  );

export const listStatesFn = createServerFn({ method: "GET" }).handler(async () =>
  wrap(async () => {
    const { ensureFoundationData } = await import("@/server/bootstrap");
    const { listStates } = await import("@/server/services");
    await ensureFoundationData();
    return listStates();
  }),
);

export const adminOverviewFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminOverview } = await import("@/server/services");
        return adminOverview(actor);
      }),
    ),
  );

export const adminUsersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListUsers } = await import("@/server/services");
        return adminListUsers(actor);
      }),
    ),
  );

export const adminAssignRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminAssignRole } = await import("@/server/services");
        return adminAssignRole(actor, data);
      }),
    ),
  );

export const adminRemoveRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminRemoveRole } = await import("@/server/services");
        return adminRemoveRole(actor, data);
      }),
    ),
  );

export const adminCasesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListCases } = await import("@/server/services");
        return adminListCases(actor);
      }),
    ),
  );

export const listAssignableStaffFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listAssignableStaff } = await import("@/server/services");
        return listAssignableStaff(actor);
      }),
    ),
  );

export const assignCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { assignCase } = await import("@/server/services");
        return assignCase(actor, data);
      }),
    ),
  );

export const adminOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListOrganizations } = await import("@/server/services");
        return adminListOrganizations(actor);
      }),
    ),
  );

export const adminCreateOrgFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminCreateOrganization } = await import("@/server/services");
        return adminCreateOrganization(actor, data);
      }),
    ),
  );

export const adminAuditFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminListAudit } = await import("@/server/services");
        return adminListAudit(actor);
      }),
    ),
  );

export const adminComplianceFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { adminCompliance } = await import("@/server/services");
        return adminCompliance(actor);
      }),
    ),
  );

export const adminIntegrationsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { listIntegrations } = await import("@/server/services");
        return listIntegrations(actor);
      }),
    ),
  );

export const adminHealthFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { systemHealth } = await import("@/server/services");
        return systemHealth(actor);
      }),
    ),
  );

export const adminSettingsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(() =>
      asUser(context.userId, async (actor) => {
        const { platformSettings } = await import("@/server/services");
        return platformSettings(actor);
      }),
    ),
  );

export const bootstrapSuperAdminFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    wrap(async () => {
      const { loadActor } = await import("@/server/actor");
      const { bootstrapSuperAdmin } = await import("@/server/services");
      // Privileged bootstrap: first SUPER_ADMIN insert cannot run as titlebridge_app.
      return bootstrapSuperAdmin(await loadActor(context.userId));
    }),
  );

export const bootstrapStatusFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () =>
    wrap(async () => {
      const { developmentDataEnabled } = await import("@/server/bootstrap");
      const { superAdminExists } = await import("@/server/services");
      return {
        developmentData: developmentDataEnabled(),
        superAdminExists: await superAdminExists(),
      };
    }),
  );
