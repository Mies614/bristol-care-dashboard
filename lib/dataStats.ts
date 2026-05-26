"use client";

import { BACKGROUND_SETTINGS_KEY } from "./background";
import { getCloudConnection, getLastSyncTime } from "./cloudSync";
import { getCurrentIdentity } from "./identity";
import { hasSharedAccess } from "./sharedAccess";
import type { AppData } from "./types";

export function getLocalDataStats(data: AppData) {
  let albumCacheCount = 0;
  let hasBackgroundSettings = false;
  if (typeof window !== "undefined") {
    try {
      hasBackgroundSettings = Boolean(window.localStorage.getItem(BACKGROUND_SETTINGS_KEY));
      albumCacheCount = Object.keys(window.localStorage).filter((key) => key.includes("album")).length;
    } catch {
      // Stats are best effort.
    }
  }
  return {
    courses: data.courses.length,
    deadlines: data.deadlines.length,
    loveNotes: data.loveNotes.length,
    periodRecords: data.periodRecords?.length || 0,
    latestPeriodDate: data.periodRecords?.[0]?.startDate || "",
    albumCacheCount,
    hasBackgroundSettings,
    currentIdentity: getCurrentIdentity(),
    sharedAccess: hasSharedAccess()
  };
}

export function getCloudStats() {
  const connection = getCloudConnection();
  return {
    connected: Boolean(connection),
    code: connection?.code || "",
    lastSync: getLastSyncTime()
  };
}
