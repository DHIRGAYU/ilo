// Where a finished sign-in may send the browser. A forwarded host is used only when it is
// this site's own host or one listed in SITE_HOSTS. Anything else stays on the request origin.

const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::[0-9]{1,5})?$/;

export function callbackOrigin(options: {
  requestOrigin: string;
  forwardedHost: string | null;
  siteHosts?: string;
  nodeEnv: string;
}): string {
  const { requestOrigin, forwardedHost, siteHosts, nodeEnv } = options;
  if (nodeEnv === "development") return requestOrigin;

  let originHost = "";
  try {
    originHost = new URL(requestOrigin).host.toLowerCase();
  } catch {
    return requestOrigin;
  }

  const allowed = new Set<string>([originHost]);
  for (const entry of (siteHosts ?? "").split(",")) {
    const host = entry.trim().toLowerCase();
    if (host && HOST.test(host)) allowed.add(host);
  }

  const forwarded = (forwardedHost ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (!forwarded || !HOST.test(forwarded) || !allowed.has(forwarded)) return requestOrigin;
  return `https://${forwarded}`;
}
