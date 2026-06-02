import type { LoveNote } from "./types";

/**
 * Identity constants used across the interaction system.
 * These map to the "identity" column in content_interactions and content_comments.
 */
export const IDENTITY_XIAOGUAI = "xiaoguai";
export const IDENTITY_ADMIN = "admin";
export const IDENTITY_DEFAULT = "default";

/**
 * Resolve the current user's identity from an optional hint.
 * Falls back to IDENTITY_XIAOGUAI.
 */
export function resolveIdentity(hint?: string | null): string {
  if (hint && hint.trim()) return hint.trim();
  return IDENTITY_XIAOGUAI;
}

/**
 * Check if an identity is the admin.
 */
export function isAdminIdentity(identity: string): boolean {
  return identity === IDENTITY_ADMIN || identity === "me";
}

/**
 * Get a human-readable label for an identity.
 */
export function getUserFacingAuthorLabel(author?: LoveNote["author"] | string) {
  if (author === "admin" || author === "me") return "我";
  return "小乖";
}

/**
 * Get a display name for a given identity in the interaction system.
 */
export function getIdentityDisplayName(identity: string): string {
  if (isAdminIdentity(identity)) return "我";
  return "小乖";
}