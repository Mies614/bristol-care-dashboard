/**
 * Origin guard for sensitive API endpoints.
 *
 * For browser-facing write endpoints (POST/PUT/PATCH/DELETE):
 *   - Origin MUST be present
 *   - Origin MUST match an exact allowlist entry
 *   - Missing Origin → 403 (assume cross-origin attack)
 *
 * Server-to-server routes (Cron, webhooks) must use independent
 * authentication (Bearer secret) and NOT rely on this guard for
 * Origin exemption.
 *
 * space_code is a DATA PARTITION field, NOT an authentication credential.
 * routing identity (/** vs /me/**) is for UI routing, NOT authorization.
 */

// Exact allowed origins — no wildcards, no pattern matching
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Vercel production URL (if configured)
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    origins.push(vercelUrl);
  }

  // Vercel preview deployments
  const vercelBranchUrl = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;
  if (vercelBranchUrl) {
    origins.push(vercelBranchUrl);
  }

  // Development origins
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    origins.push("localhost:3000");
    origins.push("127.0.0.1:3000");
    origins.push("[::1]:3000");
  }

  return origins;
}

/**
 * Returns request's origin host (hostname:port).
 * Handles malformed Origin headers gracefully.
 */
function parseOriginHost(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.host; // hostname:port
  } catch {
    return null;
  }
}

/**
 * Check if the request's Origin is trusted for browser-facing write endpoints.
 *
 * Rules:
 * - Origin MUST be present and parseable → else 403
 * - Origin host MUST exactly match an allowlist entry → else 403
 * - No wildcards, no substring matches, no Referer fallback
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const originHost = parseOriginHost(origin);
  if (!originHost) return false;

  const allowed = getAllowedOrigins();
  return allowed.includes(originHost);
}

/**
 * Check if a request is a server-to-server call with valid authentication.
 * Only for Cron, webhooks, and internal service calls.
 * Requires Bearer token validation.
 */
export function isServerToServer(request: Request): boolean {
  // Cron requests use Bearer CRON_SECRET
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && token === cronSecret) return true;
  }
  return false;
}

/**
 * Generate a 403 Forbidden response.
 */
export function forbiddenOriginResponse(): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "不允许的跨域请求。" }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
