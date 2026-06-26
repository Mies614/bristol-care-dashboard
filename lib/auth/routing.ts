import "server-only";

export type MemberRole = "owner" | "partner";

export function getRoleHome(role: MemberRole): "/" | "/me" {
  return role === "owner" ? "/me" : "/";
}

/** Owner can access both /me and partner pages. */
export function isOwnerView(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

/** Partner cannot access owner pages. */
export function isPartnerForbidden(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

export function isPathAllowedForRole(pathname: string, role: MemberRole): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") ||
      pathname.startsWith("/auth/") || pathname === "/login" ||
      pathname === "/manifest.json" || pathname === "/sw.js" || pathname === "/favicon.ico") {
    return true;
  }

  if (role === "owner") {
    // Owner can access both sides
    return true;
  }

  // Partner: cannot access /me/**
  if (isPartnerForbidden(pathname)) return false;

  return true;
}
