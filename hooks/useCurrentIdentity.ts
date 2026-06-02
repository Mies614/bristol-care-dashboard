"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import {
  getCurrentIdentityId,
  IDENTITY_CHANGED_EVENT,
} from "@/lib/identityStorage";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

/**
 * Unified hook for reading the current active identity.
 *
 * - Reads initial value from identityStorage
 * - Listens for IDENTITY_CHANGED_EVENT
 * - Also listens for storage events (cross-tab sync)
 * - SSR-safe: returns DEFAULT_NORMAL_IDENTITY_ID when window is undefined
 *
 * @param spaceCode - The space code to scope the identity to
 * @returns {{ identityId: string; refreshIdentity: () => void }}
 */
export function useCurrentIdentity(spaceCode?: string): {
  identityId: string;
  refreshIdentity: () => void;
} {
  const code = spaceCode || getDefaultSpaceCode();
  const [identityId, setIdentityId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_NORMAL_IDENTITY_ID;
    return getCurrentIdentityId(code);
  });

  const codeRef = useRef(code);
  codeRef.current = code;

  // Refresh from storage (useful after programmatic changes)
  const refreshIdentity = useCallback(() => {
    if (typeof window === "undefined") return;
    const current = getCurrentIdentityId(codeRef.current);
    setIdentityId(current);
  }, []);

  // Listen for custom identity-changed event (in-app switches)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ spaceCode?: string; identityId?: string }>).detail;
      // If event specifies a spaceCode, only react if it matches
      if (detail?.spaceCode && detail.spaceCode !== codeRef.current) return;
      if (detail?.identityId) {
        setIdentityId(detail.identityId);
      } else {
        refreshIdentity();
      }
    };

    window.addEventListener(IDENTITY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(IDENTITY_CHANGED_EVENT, handler);
  }, [refreshIdentity]);

  // Listen for storage event (cross-tab sync)
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key && event.key.includes("bristol_identity")) {
        refreshIdentity();
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshIdentity]);

  return { identityId, refreshIdentity };
}

export default useCurrentIdentity;