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
 * Origin Guard is NOT identity authentication — it only reduces
 * cross-site request abuse. space_code is a DATA PARTITION field,
 * NOT an authentication credential.
 */

/**
 * Exact allowed origins — no wildcards, no pattern matching.
 * Compares full origins (scheme + host + port) via new URL().origin.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Explicitly configured origins (comma-separated)
  //   ALLOWED_ORIGINS=https://example.com,https://www.example.com
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured) {
    for (const entry of configured.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) {
        try {
          origins.push(new URL(trimmed).origin);
        } catch {
          // Skip malformed entries
        }
      }
    }
  }

  // Vercel production URL (set automatically by Vercel at runtime)
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdUrl) {
    try {
      origins.push(new URL(`https://${vercelProdUrl}`).origin);
    } catch {
      // Skip malformed
    }
  }

  // Vercel deployment URL (automatically available at runtime)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl !== vercelProdUrl) {
    try {
      origins.push(new URL(`https://${vercelUrl}`).origin);
    } catch {
      // Skip malformed
    }
  }

  // Development origins (only in non-production)
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
    origins.push("http://[::1]:3000");
  }

  return origins;
}

/**
 * Parse the origin into a normalized URL.origin form.
 * This handles scheme, host, port, and trailing-slash normalization.
 */
function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

/**
 * Check if the request's Origin is trusted for browser-facing write endpoints.
 *
 * Rules:
 * - Origin MUST be present and parseable → else 403
 * - Origin origin MUST exactly match an allowlist entry → else 403
 * - No wildcards, no substring matches, no Referer fallback
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const allowed = getAllowedOrigins();
  return allowed.includes(normalized);
}

/**
 * Check if a request is a server-to-server call with valid authentication.
 * Only for Cron, webhooks, and internal service calls.
 * Requires Bearer token validation.
 */
export function isServerToServer(request: Request): boolean {
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
    JSON.stringify({ ok: false, error: "Origin not allowed." }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}
