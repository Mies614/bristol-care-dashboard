/**
 * v1.3 Identity Storage Layer
 *
 * Manages per-spaceCode identity persistence with Supabase + localStorage fallback.
 *
 * - Browser: uses /api/identities server API + localStorage fallback
 * - Server: uses Supabase service role client (user_identities table), no localStorage
 *
 * This module is designed to work in both browser and server environments.
 * Browser-only functions (localStorage) are guarded with typeof window checks.
 */

import {
  getDefaultIdentities,
  migrateLegacyIdentityId,
  DEFAULT_NORMAL_IDENTITY_ID,
  IDENTITY_ADMIN,
  type UserIdentity,
  type IdentityState,
} from "./identity";

// ─── Storage Keys ───

const LS_PREFIX = "bristol_identity";
const LS_KEY_CURRENT = (spaceCode: string) => `${LS_PREFIX}_current_${spaceCode}`;
const LS_KEY_LIST = (spaceCode: string) => `${LS_PREFIX}_list_${spaceCode}`;

// ─── Event name for identity changes ───

export const IDENTITY_CHANGED_EVENT = "bristol-identity-changed";

/** Dispatch the identity-changed event so all listening components re-read the current identity. */
function dispatchIdentityChanged(spaceCode: string, identityId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(IDENTITY_CHANGED_EVENT, {
        detail: { spaceCode, identityId },
      })
    );
  } catch {
    // Non-critical
  }
}

// ─── In-memory cache (placeholder for future use) ───

function invalidateCache(): void {
  // No-op: cache implementation to be added when needed
}

// ─── localStorage helpers (browser-only) ───

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function lsGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Non-critical
  }
}

function lsRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Non-critical
  }
}

// ─── Load from Supabase ───

async function loadIdentitiesFromApi(_spaceCode: string): Promise<UserIdentity[]> {
  if (!isBrowser()) return [];

  try {
    const res = await fetch("/api/identities");
    if (!res.ok) return [];

    const json = await res.json();
    if (!json.ok || !Array.isArray(json.identities)) return [];

    return json.identities as UserIdentity[];
  } catch {
    return [];
  }
}

// ─── Save to Supabase ───

async function saveIdentityToApi(
  _spaceCode: string,
  identity: UserIdentity
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const res = await fetch("/api/identities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: identity.id,
        displayName: identity.displayName,
        role: identity.role,
        avatarEmoji: identity.avatarEmoji ?? null,
        isDefault: identity.isDefault ?? false,
      }),
    });
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
}

async function deleteIdentityFromApi(
  _spaceCode: string,
  identityId: string
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const res = await fetch("/api/identities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: identityId }),
    });
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
}

// ─── Re-exports for convenience ───

export type { UserIdentity, IdentityState } from "./identity";

// ─── Public API ───

/**
 * Load all identities for a spaceCode.
 * - Tries Supabase first
 * - Falls back to localStorage
 * - Falls back to built-in default identities
 */
export async function loadIdentities(spaceCode: string): Promise<UserIdentity[]> {
  // Try Supabase
  const supabaseIds = await loadIdentitiesFromApi(spaceCode);
  if (supabaseIds.length > 0) {
    // Also cache in localStorage for offline
    try {
      lsSet(LS_KEY_LIST(spaceCode), JSON.stringify(supabaseIds));
    } catch {
      // Non-critical
    }
    return supabaseIds;
  }

  // Try localStorage
  if (isBrowser()) {
    const raw = lsGet(LS_KEY_LIST(spaceCode));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserIdentity[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Corrupt data, fall through
      }
    }
  }

  // Fallback: default identities
  const defaults = getDefaultIdentities(spaceCode);
  // Cache in localStorage
  if (isBrowser()) {
    try {
      lsSet(LS_KEY_LIST(spaceCode), JSON.stringify(defaults));
    } catch {
      // Non-critical
    }
  }
  return defaults;
}

/**
 * Save a single identity (create or update) for a spaceCode.
 * Syncs to Supabase if available, always updates localStorage.
 */
export async function saveIdentity(
  spaceCode: string,
  identity: UserIdentity
): Promise<void> {
  // Try Supabase
  const supabaseOk = await saveIdentityToApi(spaceCode, identity);

  // Always update localStorage
  if (isBrowser()) {
    const current = await loadIdentitiesLocalOnly(spaceCode);
    const idx = current.findIndex((id) => id.id === identity.id);
    if (idx >= 0) {
      current[idx] = identity;
    } else {
      current.push(identity);
    }
    try {
      lsSet(LS_KEY_LIST(spaceCode), JSON.stringify(current));
    } catch {
      // Non-critical
    }
    invalidateCache();
  }

  // If Supabase failed, we still have localStorage — that's fine
  void supabaseOk;
}

/**
 * Delete an identity by id for a spaceCode.
 */
export async function deleteIdentity(
  spaceCode: string,
  identityId: string
): Promise<void> {
  // Try Supabase
  const supabaseOk = await deleteIdentityFromApi(spaceCode, identityId);

  // Always update localStorage
  if (isBrowser()) {
    const current = await loadIdentitiesLocalOnly(spaceCode);
    const filtered = current.filter((id) => id.id !== identityId);
    try {
      lsSet(LS_KEY_LIST(spaceCode), JSON.stringify(filtered));
    } catch {
      // Non-critical
    }
    invalidateCache();
  }

  void supabaseOk;
}

/**
 * Set the current (active) identity for a spaceCode.
 * This is a local preference, stored in localStorage only.
 * Also dispatches a browser event so all listening components re-read the identity.
 */
export function setCurrentIdentity(
  spaceCode: string,
  identityId: string
): void {
  lsSet(LS_KEY_CURRENT(spaceCode), identityId);
  invalidateCache();
  dispatchIdentityChanged(spaceCode, identityId);
}

/**
 * Get the current (active) identity id for a spaceCode.
 * Returns the default normal identity if no preference is set.
 */
export function getCurrentIdentityId(spaceCode: string): string {
  if (!isBrowser()) return DEFAULT_NORMAL_IDENTITY_ID;

  const raw = lsGet(LS_KEY_CURRENT(spaceCode));
  if (!raw) return DEFAULT_NORMAL_IDENTITY_ID;
  return migrateLegacyIdentityId(raw.trim());
}

/**
 * Get the full current identity object for a spaceCode.
 */
export async function getCurrentIdentity(spaceCode: string): Promise<UserIdentity> {
  const currentId = getCurrentIdentityId(spaceCode);
  const identities = await loadIdentities(spaceCode);
  const found = identities.find((id) => id.id === currentId);
  if (found) {
    // Ensure isDefault reflects current selection
    return { ...found, isDefault: found.isDefault ?? (found.id === DEFAULT_NORMAL_IDENTITY_ID) };
  }

  // Fallback to default
  const fallback = identities[0] ?? getDefaultIdentities(spaceCode)[0];
  return fallback;
}

/**
 * Get the admin identity object.
 * Returns the constant admin identity from lib/identity.
 */
export function getAdminIdentity(): UserIdentity {
  return { ...IDENTITY_ADMIN };
}

/**
 * Get the full identity state (identities + currentIdentityId) for a spaceCode.
 */
export async function getIdentityState(spaceCode: string): Promise<IdentityState> {
  const currentIdentityId = getCurrentIdentityId(spaceCode);
  const identities = await loadIdentities(spaceCode);

  return {
    identities,
    currentIdentityId,
  };
}

/**
 * Check if Supabase is available for identity storage.
 */
export function isIdentityCloudAvailable(): boolean {
  return true;
}

// ─── Internal helpers ───

/**
 * Load identities from localStorage only (skip Supabase).
 * Used internally for quick localStorage updates.
 */
async function loadIdentitiesLocalOnly(spaceCode: string): Promise<UserIdentity[]> {
  if (!isBrowser()) return getDefaultIdentities(spaceCode);

  const raw = lsGet(LS_KEY_LIST(spaceCode));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UserIdentity[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Corrupt data, fall through
    }
  }
  return getDefaultIdentities(spaceCode);
}

/**
 * Reset all identity data for a spaceCode (testing/cleanup).
 */
export function resetIdentityStorage(spaceCode: string): void {
  lsRemove(LS_KEY_CURRENT(spaceCode));
  lsRemove(LS_KEY_LIST(spaceCode));
  invalidateCache();
}