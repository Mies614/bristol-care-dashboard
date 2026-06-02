"use client";

/**
 * Reminder preferences storage (localStorage).
 * Preferences are synced to Supabase when cloud is configured.
 */

export interface ReminderPreferences {
  /** Daily reminder time in HH:MM format (e.g. "09:00") */
  reminderTime: string;
  enabled: boolean;
  weatherReminder: boolean;
  deadlineReminder: boolean;
  missYouReminder: boolean;
  periodReminder: boolean;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  reminderTime: "09:00",
  enabled: true,
  weatherReminder: true,
  deadlineReminder: true,
  missYouReminder: true,
  periodReminder: false,
};

const STORAGE_KEY = "bristol_dashboard_reminder_prefs";

export function loadReminderPreferences(): ReminderPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_REMINDER_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<ReminderPreferences>;
    return {
      reminderTime: typeof parsed.reminderTime === "string" && /^\d{2}:\d{2}$/.test(parsed.reminderTime)
        ? parsed.reminderTime
        : DEFAULT_REMINDER_PREFERENCES.reminderTime,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_REMINDER_PREFERENCES.enabled,
      weatherReminder: typeof parsed.weatherReminder === "boolean" ? parsed.weatherReminder : DEFAULT_REMINDER_PREFERENCES.weatherReminder,
      deadlineReminder: typeof parsed.deadlineReminder === "boolean" ? parsed.deadlineReminder : DEFAULT_REMINDER_PREFERENCES.deadlineReminder,
      missYouReminder: typeof parsed.missYouReminder === "boolean" ? parsed.missYouReminder : DEFAULT_REMINDER_PREFERENCES.missYouReminder,
      periodReminder: typeof parsed.periodReminder === "boolean" ? parsed.periodReminder : DEFAULT_REMINDER_PREFERENCES.periodReminder,
    };
  } catch {
    return { ...DEFAULT_REMINDER_PREFERENCES };
  }
}

export function saveReminderPreferences(prefs: ReminderPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Non-critical: ignore storage errors
  }
}
