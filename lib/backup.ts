"use client";

import { getBackgroundSettings, sanitizeBackgroundSettingsForCloud } from "./background";
import { loadAppData, saveAppData } from "./storage";
import { getThemeSettings } from "./theme";
import { validateAppData } from "./validation";

export function createBackupPayload() {
  const data = loadAppData();
  return {
    ...data,
    quickLinks: data.links,
    settings: {
      nickname: data.nickname,
      nextMeetDate: data.nextMeetDate,
      semesterEndDate: data.semesterEndDate
    },
    backgroundSettings: sanitizeBackgroundSettingsForCloud(getBackgroundSettings()),
    themeSettings: getThemeSettings()
  };
}

export function restoreBackupPayload(value: unknown) {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const current = loadAppData();
  const merged = {
    ...current,
    ...record,
    links: Array.isArray(record.links) ? record.links : Array.isArray(record.quickLinks) ? record.quickLinks : current.links
  };
  const data = validateAppData(merged);
  saveAppData(data, { suppressAutoSync: true });
  return data;
}
