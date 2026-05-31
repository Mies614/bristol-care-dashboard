"use client";

import { defaultAppData } from "./sampleData";
import type { AppData } from "./types";
import { validateAppData } from "./validation";
import { getBackgroundSettings, saveBackgroundSettings } from "./background";
import { markLocalChange, scheduleAutoSync } from "./autoSync";
import { getThemeSettings, saveThemeSettings } from "./theme";

export const STORAGE_KEY = "bristol-care-data-v1";

export function loadAppData(): AppData {
  if (typeof window === "undefined") return defaultAppData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppData(defaultAppData, { suppressAutoSync: true });
      return defaultAppData;
    }
    const parsed = JSON.parse(raw);
    const validated = validateAppData(parsed);

    // Write back repaired data (e.g. courses/deadlines with fixed ids)
    // so old broken data is automatically healed on next load
    if (!deepEqual(parsed, validated)) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      } catch {
        // Non-critical: repair will be retried on next load
      }
    }

    return { ...validated, backgroundSettings: getBackgroundSettings(), themeSettings: getThemeSettings() };
  } catch {
    return defaultAppData;
  }
}

/**
 * Shallow deep-equal for AppData-like objects.
 * Only checks known keys to avoid false negatives from extra fields.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function saveAppData(data: AppData, options: { suppressAutoSync?: boolean; syncReason?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    const backgroundSettings = saveBackgroundSettings(data.backgroundSettings);
    const themeSettings = saveThemeSettings(data.themeSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, backgroundSettings, themeSettings }));
    window.dispatchEvent(new Event("bristol-care-data"));
    if (!options.suppressAutoSync) {
      markLocalChange(options.syncReason || "app_data");
      scheduleAutoSync(options.syncReason || "app_data_changed");
    }
  } catch {
    try {
      window.dispatchEvent(new Event("bristol-care-data"));
    } catch {
      // Keep rendering even when localStorage or Event is unavailable.
    }
  }
}

export function resetAppData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("bristol_dashboard_current_identity");
  } catch {
    // Ignore unavailable storage.
  } finally {
    saveAppData(defaultAppData, { suppressAutoSync: true });
  }
}