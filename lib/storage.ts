"use client";

import { defaultAppData } from "./sampleData";
import type { AppData } from "./types";
import { validateAppData } from "./validation";
import { getBackgroundSettings, saveBackgroundSettings } from "./background";

export const STORAGE_KEY = "bristol-care-data-v1";

export function loadAppData(): AppData {
  if (typeof window === "undefined") return defaultAppData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppData(defaultAppData);
      return defaultAppData;
    }
    return { ...validateAppData(JSON.parse(raw)), backgroundSettings: getBackgroundSettings() };
  } catch {
    return defaultAppData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") return;
  try {
    const backgroundSettings = saveBackgroundSettings(data.backgroundSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, backgroundSettings }));
    window.dispatchEvent(new Event("bristol-care-data"));
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
  } catch {
    // Ignore unavailable storage.
  } finally {
    saveAppData(defaultAppData);
  }
}
