/**
 * v1.3 Formal Identity System
 *
 * Provides unified identity types, constants, and pure-function utilities.
 * No browser APIs, no Supabase — pure logic only.
 *
 * Identity model:
 * - Each identity has a stable string id (e.g. "xiaoguai", "me", "admin")
 * - Each identity has a role: "self" | "partner" | "admin"
 * - Legacy values "default" and empty strings are migrated to the default identity
 */

// ─── Types ───

export type UserIdentityRole = "self" | "partner" | "admin";

export interface UserIdentity {
  id: string;
  displayName: string;
  role: UserIdentityRole;
  avatarEmoji?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityState {
  identities: UserIdentity[];
  currentIdentityId: string;
}

// ─── Constants ───

export const IDENTITY_SELF: UserIdentity = {
  id: "me",
  displayName: "我",
  role: "self",
  avatarEmoji: "🌙",
  isDefault: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const IDENTITY_PARTNER: UserIdentity = {
  id: "xiaoguai",
  displayName: "小乖",
  role: "partner",
  avatarEmoji: "🐰",
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const IDENTITY_ADMIN: UserIdentity = {
  id: "admin",
  displayName: "Admin",
  role: "admin",
  avatarEmoji: "🛠️",
  isDefault: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Default identity id for normal (non-admin) users. */
export const DEFAULT_NORMAL_IDENTITY_ID = "xiaoguai";

/** Admin identity id constant. */
export const ADMIN_IDENTITY_ID = "admin";

/** Legacy identity value that maps to the default normal identity. */
export const LEGACY_DEFAULT_IDENTITY = "default";

// ─── Default Identities ───

/**
 * Get the three built-in default identities for a given spaceCode.
 * Timestamps are set at call time so they reflect each app session.
 */
export function getDefaultIdentities(_spaceCode: string): UserIdentity[] {
  const now = new Date().toISOString();
  return [
    { ...IDENTITY_PARTNER, createdAt: now, updatedAt: now },
    { ...IDENTITY_SELF, createdAt: now, updatedAt: now },
    { ...IDENTITY_ADMIN, isDefault: false, createdAt: now, updatedAt: now },
  ];
}

// ─── Normalize / Migrate ───

/**
 * Migrate a legacy identity id to the new system.
 * - "default" → the default normal identity ("xiaoguai")
 * - Empty/null → the default normal identity ("xiaoguai")
 * - "admin" → "admin" (unchanged)
 * - "me" → "me" (unchanged)
 * - "xiaoguai" → "xiaoguai" (unchanged)
 */
export function migrateLegacyIdentityId(id: string | null | undefined): string {
  if (!id || id.trim() === "" || id.trim() === LEGACY_DEFAULT_IDENTITY) {
    return DEFAULT_NORMAL_IDENTITY_ID;
  }
  return id.trim();
}

/**
 * Normalize an identity id input.
 * Same as migrateLegacyIdentityId but with a different semantic intent
 * for cases where you just want to clean up an identity string.
 */
export function normalizeIdentityId(input: string | null | undefined): string {
  return migrateLegacyIdentityId(input);
}

// ─── Lookup ───

/**
 * Resolve the current identity from a list of identities and an identity id hint.
 * Falls back to the default normal identity if the id is not found.
 */
export function resolveCurrentIdentity(
  identities: UserIdentity[],
  identityIdHint?: string | null
): UserIdentity {
  const normalized = normalizeIdentityId(identityIdHint);
  const found = identities.find((id) => id.id === normalized);
  if (found) return found;

  // Fallback: find default identity, or first partner/self identity, or partner identity
  const defaultId =
    identities.find((id) => id.isDefault) ??
    identities.find((id) => id.role === "partner") ??
    identities.find((id) => id.role === "self") ??
    identities[0];
  if (defaultId) return defaultId;

  // Ultimate fallback
  return { ...IDENTITY_PARTNER };
}

/**
 * Get a specific identity by id from a list.
 */
export function getIdentityById(
  identities: UserIdentity[],
  identityId: string
): UserIdentity | undefined {
  return identities.find((id) => id.id === identityId);
}

// ─── Comparison ───

/**
 * Check if an identity id (from interactions/comments) represents an admin.
 */
export function isAdminIdentity(identityId: string | null | undefined): boolean {
  const normalized = normalizeIdentityId(identityId);
  return normalized === ADMIN_IDENTITY_ID || normalized === "me";
}

/**
 * Check if two identity ids refer to the same identity.
 */
export function isSameIdentity(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeIdentityId(a) === normalizeIdentityId(b);
}

// ─── Labels / Display ───

/**
 * Get a human-readable display label for an identity id.
 * Uses the provided identities list for custom names,
 * falls back to built-in constants.
 */
export function getIdentityLabel(
  identityId: string | null | undefined,
  identities?: UserIdentity[]
): string {
  const normalized = normalizeIdentityId(identityId);

  // Check custom identities first
  if (identities && identities.length > 0) {
    const found = identities.find((id) => id.id === normalized);
    if (found) return found.displayName;
  }

  // Fallback to built-in constants
  switch (normalized) {
    case "xiaoguai":
      return "小乖";
    case "me":
      return "我";
    case "admin":
      return "Admin";
    default:
      return normalized || "未知";
  }
}

/**
 * Get the avatar emoji for an identity id.
 */
export function getIdentityAvatarEmoji(
  identityId: string | null | undefined,
  identities?: UserIdentity[]
): string | undefined {
  const normalized = normalizeIdentityId(identityId);

  if (identities && identities.length > 0) {
    const found = identities.find((id) => id.id === normalized);
    if (found) return found.avatarEmoji;
  }

  switch (normalized) {
    case "xiaoguai":
      return "🐰";
    case "me":
      return "🌙";
    case "admin":
      return "🛠️";
    default:
      return undefined;
  }
}

/**
 * Get a user-facing author label for LoveNote authors.
 * Compatible with existing LoveNoteCard usage.
 */
export function getUserFacingAuthorLabel(author?: string | null): string {
  return getIdentityLabel(author);
}

/**
 * Get a display name for a given identity in the interaction system.
 */
export function getIdentityDisplayName(identityId: string): string {
  return getIdentityLabel(identityId);
}

// ─── Deprecated aliases (backward compatible with old lib/identity.ts exports) ───

/** @deprecated Use DEFAULT_NORMAL_IDENTITY_ID or normalizeIdentityId */
export const IDENTITY_XIAOGUAI = "xiaoguai";

/** @deprecated Use ADMIN_IDENTITY_ID */
export const IDENTITY_ADMIN_LEGACY = "admin";

/** @deprecated Use LEGACY_DEFAULT_IDENTITY */
export const IDENTITY_DEFAULT = LEGACY_DEFAULT_IDENTITY;

/** @deprecated Use normalizeIdentityId */
export function resolveIdentity(hint?: string | null): string {
  return normalizeIdentityId(hint);
}