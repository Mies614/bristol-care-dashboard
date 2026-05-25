"use client";

import { defaultAppData } from "./sampleData";
import type { AppData } from "./types";
import { validateAppData } from "./validation";
import { getBackgroundSettings, saveBackgroundSettings } from "./background";

export const STORAGE_KEY = "bristol-care-data-v1";

export function loadAppData(): AppData {
  if (typeof window === "undefined") return defaultAppData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveAppData(defaultAppData);
    return defaultAppData;
  }
  try {
    return { ...validateAppData(JSON.parse(raw)), backgroundSettings: getBackgroundSettings() };
  } catch {
    return defaultAppData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") return;
  saveBackgroundSettings(data.backgroundSettings);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("bristol-care-data"));
}

export function resetAppData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  saveAppData(defaultAppData);
}
