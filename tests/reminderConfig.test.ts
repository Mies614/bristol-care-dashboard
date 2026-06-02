import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  DEFAULT_REMINDER_PREFERENCES,
  loadReminderPreferences,
  saveReminderPreferences,
} from "@/lib/reminderConfig";
import type { ReminderPreferences } from "@/lib/reminderConfig";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("reminderConfig", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const storage = makeStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
  });

  describe("DEFAULT_REMINDER_PREFERENCES", () => {
    it("has correct defaults", () => {
      expect(DEFAULT_REMINDER_PREFERENCES.reminderTime).toBe("09:00");
      expect(DEFAULT_REMINDER_PREFERENCES.enabled).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.weatherReminder).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.deadlineReminder).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.missYouReminder).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.periodReminder).toBe(false);
    });
  });

  describe("loadReminderPreferences", () => {
    it("returns defaults when nothing saved", () => {
      const prefs = loadReminderPreferences();
      expect(prefs.reminderTime).toBe("09:00");
      expect(prefs.enabled).toBe(true);
    });

    it("loads saved preferences", () => {
      const saved: ReminderPreferences = {
        reminderTime: "10:30",
        enabled: false,
        weatherReminder: false,
        deadlineReminder: true,
        missYouReminder: false,
        periodReminder: true,
      };

      localStorage.setItem("bristol_dashboard_reminder_prefs", JSON.stringify(saved));
      const prefs = loadReminderPreferences();
      expect(prefs.reminderTime).toBe("10:30");
      expect(prefs.enabled).toBe(false);
      expect(prefs.weatherReminder).toBe(false);
      expect(prefs.deadlineReminder).toBe(true);
      expect(prefs.missYouReminder).toBe(false);
      expect(prefs.periodReminder).toBe(true);
    });

    it("sanitizes invalid reminderTime", () => {
      localStorage.setItem(
        "bristol_dashboard_reminder_prefs",
        JSON.stringify({ reminderTime: "invalid" })
      );
      const prefs = loadReminderPreferences();
      expect(prefs.reminderTime).toBe("09:00"); // falls back to default
    });

    it("handles corrupted JSON", () => {
      localStorage.setItem("bristol_dashboard_reminder_prefs", "not json");
      const prefs = loadReminderPreferences();
      expect(prefs.reminderTime).toBe("09:00");
      expect(prefs.enabled).toBe(true);
    });
  });

  describe("saveReminderPreferences", () => {
    it("saves and loads correctly", () => {
      const prefs: ReminderPreferences = {
        reminderTime: "08:30",
        enabled: true,
        weatherReminder: true,
        deadlineReminder: false,
        missYouReminder: true,
        periodReminder: false,
      };

      saveReminderPreferences(prefs);
      const loaded = loadReminderPreferences();
      expect(loaded.reminderTime).toBe("08:30");
      expect(loaded.deadlineReminder).toBe(false);
      expect(loaded.missYouReminder).toBe(true);
    });

    it("does not crash when localStorage is unavailable", () => {
      vi.stubGlobal("localStorage", undefined);
      vi.stubGlobal("window", undefined);

      expect(() =>
        saveReminderPreferences(DEFAULT_REMINDER_PREFERENCES)
      ).not.toThrow();
    });
  });
});
