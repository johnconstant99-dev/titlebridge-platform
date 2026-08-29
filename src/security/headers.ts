/**
 * Secure HTTP headers for API responses.
 * Do not set a Content-Security-Policy that blocks https://grok.com — the
 * platform branding injector requires that origin.
 */
export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}

export function applySecurityHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(securityHeaders())) {
    headers.set(key, value);
  }
}
