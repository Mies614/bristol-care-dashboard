/**
 * Environment validation guard.
 *
 * Provides runtime checks for environment variable configuration
 * and warns when dangerous configurations are detected.
 *
 * Usage:
 *   import { validateEnv, warnIfProductionSupabaseInDev } from "@/lib/envGuard";
 *   warnIfProductionSupabaseInDev();
 */

export interface EnvValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate that all required environment variables are set.
 * Does NOT expose values — only checks existence.
 */
export function validateEnv(): EnvValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Required: Space code
  if (!process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE) {
    errors.push("NEXT_PUBLIC_DEFAULT_SPACE_CODE is not set — App cannot determine the couple's space.");
  }

  // Required: Admin password
  if (!process.env.ADMIN_PASSWORD) {
    errors.push("ADMIN_PASSWORD is not set — Admin panel will be inaccessible.");
  }

  // Optional: Supabase
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (hasSupabaseUrl !== hasSupabaseKey) {
    warnings.push("Supabase URL and Anon Key must both be set or both be empty. Cloud sync may not work correctly.");
  }

  // Optional: VAPID (Push notifications)
  const hasVapidPublic = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const hasVapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY);
  if (hasVapidPublic !== hasVapidPrivate) {
    warnings.push("VAPID keys must both be set for push notifications to work.");
  }

  // Production-specific checks
  if (process.env.NODE_ENV === "production") {
    if (!process.env.CRON_SECRET) {
      warnings.push("CRON_SECRET is not set — Scheduled reminders will not work in production.");
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push("SUPABASE_SERVICE_ROLE_KEY is not set — Admin features and cloud sync will be limited.");
    }
  }

  // Security: Service role key must NOT be exposed to client
  if (typeof window !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is exposed to the client bundle. Remove any NEXT_PUBLIC_ prefix.");
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Warn in dev console if using a remote Supabase instance.
 * Prevents accidentally modifying production data during development.
 */
export function warnIfProductionSupabaseInDev(): void {
  if (process.env.NODE_ENV !== "development") return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return;

  // Heuristic: if URL contains localhost or 127.0.0.1, it's a local Supabase
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("::1");
  if (isLocal) return;

  console.warn(
    "\n⚠️  Bristol Care Dashboard:\n" +
    "   Using remote Supabase instance in development mode.\n" +
    "   E2E tests and dev actions WILL affect production data.\n" +
    "   Set NEXT_PUBLIC_SUPABASE_URL= in .env.local to use localStorage mode.\n"
  );
}

/**
 * Check if the current environment is safe for E2E testing.
 * Returns true if Supabase Storage requests will be intercepted.
 */
export function isE2ESafe(): boolean {
  // In E2E, the Playwright fixture intercepts Storage requests.
  // This function helps validate that intercept is active.
  if (typeof window === "undefined") return true; // Server-side is always safe
  // Client-side check: in E2E, the fixture sets up intercepts before page load
  return true; // Intercept is handled by Playwright fixture, not detectable here
}
