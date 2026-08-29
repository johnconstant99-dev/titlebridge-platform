/**
 * Future authentication architecture (not implemented in Phase 1B Private Beta).
 *
 * Supported now: email/password (this app's Better Auth) and Google / X via the
 * Grok auth broker. Do not add other providers in this phase.
 *
 * Planned later, behind explicit product approval:
 * - Passkeys / WebAuthn
 * - Multi-factor authentication
 * - Additional social login (only if the broker supports the upstream)
 * - Enterprise SSO (SAML / OIDC)
 *
 * Email verification and password reset UIs exist; outbound email delivery
 * requires a later provider adapter under integrations/identity and must not
 * be faked.
 */
export const FUTURE_AUTH_METHODS = [
  "passkeys",
  "mfa",
  "enterprise_sso",
] as const;

export const FUTURE_AUTH_STATUS = "not_configured" as const;
