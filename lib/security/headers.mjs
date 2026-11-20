// Response headers for every page. Kept as plain JS so next.config.mjs can import it.

function supabaseConnectSources(supabaseUrl) {
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    const ws = `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`;
    return [url.origin, ws];
  } catch {
    return [];
  }
}

/**
 * @param {{ supabaseUrl?: string, production?: boolean, nonce?: string | null }} options
 */
export function contentSecurityPolicy({ supabaseUrl, production, nonce = null }) {
  const connect = ["'self'", "https://*.daily.co", "wss://*.daily.co", ...supabaseConnectSources(supabaseUrl)];
  // Development needs Next's inline bootstrap and Turbopack's eval. Production stamps a nonce instead.
  const script = production
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'";
  return [
    "default-src 'self'",
    script,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connect.join(" ")}`,
    "frame-src 'self' https://*.daily.co",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob: https://*.daily.co",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
}

function dailyOrigin(domain) {
  const host = (domain ?? "").trim().replace(/^https?:\/\//, "").replace(/\.daily\.co.*$/, "").replace(/\/.*$/, "");
  return host ? `https://${host}.daily.co` : null;
}

/**
 * @param {string | undefined} dailyDomain
 */
export function permissionsPolicy(dailyDomain) {
  const origin = dailyOrigin(dailyDomain);
  const allow = origin ? `(self "${origin}")` : "(self)";
  return `camera=${allow}, microphone=${allow}, autoplay=${allow}, geolocation=(), payment=()`;
}

/**
 * @param {{ supabaseUrl?: string, production?: boolean, nonce?: string | null, dailyDomain?: string }} options
 */
export function buildSecurityHeaders({ supabaseUrl, production, nonce = null, dailyDomain }) {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: permissionsPolicy(dailyDomain) },
  ];
  // Production CSP is set per request in the proxy, so a second static policy cannot block the nonce.
  if (!production || nonce) {
    headers.unshift({ key: "Content-Security-Policy", value: contentSecurityPolicy({ supabaseUrl, production, nonce }) });
  }
  if (production) headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  return headers;
}
