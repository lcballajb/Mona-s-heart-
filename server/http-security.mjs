export function securityHeaders({ production = false } = {}) {
  return {
    "content-security-policy":
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "strict-transport-security": production
      ? "max-age=31536000; includeSubDomains"
      : "max-age=0",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    "cross-origin-resource-policy": "same-origin",
    "cache-control": "no-store, private",
    pragma: "no-cache",
  };
}
export function allowedOrigin(origin, allowlist = []) {
  return !origin || allowlist.includes(origin);
}
export function clientAddress(request, { trustedProxies = [] } = {}) {
  const direct = request.socket.remoteAddress ?? "unknown";
  if (!trustedProxies.includes(direct)) return direct;
  const forwarded = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  return forwarded && /^[\da-f:.]{3,45}$/i.test(forwarded) ? forwarded : direct;
}
