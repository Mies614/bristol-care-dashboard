/**
 * Fixed App Identity Layer
 *
 * In the new dual-entry architecture, the current identity is determined
 * solely by the URL path prefix — not by localStorage or user switching.
 *
 * Rules:
 * - /me/**   → owner → identity = "me",     role = "owner"
 * - /**      → partner → identity = DEFAULT_NORMAL_IDENTITY_ID, role = "partner"
 *
 * This module is pure and can be used on both client and server.
 */

import { DEFAULT_NORMAL_IDENTITY_ID, getIdentityLabel } from "@/lib/identity";

export type AppSide = "partner" | "owner";

/**
 * Determine which app side we're on from the current URL pathname.
 */
export function getSideFromPath(pathname: string): AppSide {
  if (pathname.startsWith("/me")) return "owner";
  return "partner";
}

/**
 * Get the fixed identity id for a given app side.
 */
export function getIdentityForSide(side: AppSide): string {
  return side === "owner" ? "me" : DEFAULT_NORMAL_IDENTITY_ID;
}

/**
 * Get the role associated with an app side.
 */
export function getRoleForSide(side: AppSide): "partner" | "owner" {
  return side === "owner" ? "owner" : "partner";
}

/**
 * Get a human-readable label for an app side.
 */
export function getAppSideLabel(side: AppSide): string {
  const identityId = getIdentityForSide(side);
  return getIdentityLabel(identityId);
}