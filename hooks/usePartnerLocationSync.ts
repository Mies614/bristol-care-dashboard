"use client";

import { useEffect, useCallback, useRef } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

const SYNC_KEY = "bristol_dashboard_partner_location_sync";

function getLastSync(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function setLastSync(ts: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_KEY, String(ts));
  } catch {
    // Storage unavailable
  }
}

/**
 * Hook that syncs the partner's geolocation to the cloud.
 * Only active on the partner side (/ routes, not /me).
 *
 * Behavior:
 * - If geolocation permission is "granted", auto-sync every 30 minutes.
 * - If "prompt", does nothing (doesn't trigger browser prompt).
 * - If "denied", does nothing.
 * - Saves to /api/location with identity = DEFAULT_NORMAL_IDENTITY_ID.
 */
export function usePartnerLocationSync(enabled: boolean) {
  const syncingRef = useRef(false);

  const syncLocation = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    // Check permission state
    let permissionState: PermissionState = "prompt";
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      permissionState = result.state;
    } catch {
      // Permissions API not available — fall through and try getCurrentPosition
    }

    if (permissionState === "denied") return;

    // Only auto-sync if permission is already granted
    if (permissionState !== "granted") return;

    const lastSync = getLastSync();
    const now = Date.now();
    // Throttle: 30 minutes
    if (lastSync && now - lastSync < 30 * 60 * 1000) return;

    syncingRef.current = true;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30 * 60 * 1000, // Use cached position up to 30 min
        });
      });

      const coords = position.coords;
      const spaceCode = getDefaultSpaceCode();

      await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceCode,
          identity: DEFAULT_NORMAL_IDENTITY_ID,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      });

      setLastSync(now);
    } catch {
      // Silent fail — location sync is non-critical
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    syncLocation();
  }, [enabled, syncLocation]);
}