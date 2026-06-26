import "server-only";

export type MemberRole = "owner" | "partner";

/** Map role to its canonical home path. */
export function getRoleHome(role: MemberRole): "/" | "/me" {
  return role === "owner" ? "/me" : "/";
}

/**
 * Owner-allowed path prefixes. Owner can only access /me, login, auth, and API/static.
 */
const OWNER_ALLOWED_PREFIXES = ["/me", "/login", "/auth"];

/**
 * Partner-allowed path prefixes. Partner can access all partner routes but NOT /me.
 */
const PARTNER_ALLOWED_PREFIXES = [
  "/", "/memories", "/albums", "/notes", "/settings",
  "/cards", "/records", "/period", "/deadlines", "/schedule",
  "/ping", "/login", "/auth",
];

/**
 * Check whether a pathname is allowed for a given role.
 * API routes and static assets pass through — they handle auth internally.
 */
export function isPathAllowedForRole(pathname: string, role: MemberRole): boolean {
  // API routes, static assets, auth callback, login: always pass through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }

  if (role === "owner") {
    return OWNER_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }

  // Partner: must NOT be /me or /me/**
  if (pathname === "/me" || pathname.startsWith("/me/")) {
    return false;
  }

  return PARTNER_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
