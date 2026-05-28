/**
 * Server-safe space code utility.
 * No "use client", no window/localStorage.
 * Safe to import from API routes, server components, and server helpers.
 */

export const FALLBACK_SPACE_CODE = "xiaoguai520";

/**
 * Get default space code from environment variable.
 * Safe for server-side use only.
 */
export function getDefaultSpaceCodeServer(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || FALLBACK_SPACE_CODE;
}

/**
 * Normalize a space code: use the provided code, or fall back to
 * NEXT_PUBLIC_DEFAULT_SPACE_CODE, or the hardcoded FALLBACK_SPACE_CODE.
 */
export function normalizeSpaceCode(code?: string | null): string {
  return (code || process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || FALLBACK_SPACE_CODE).trim();
}