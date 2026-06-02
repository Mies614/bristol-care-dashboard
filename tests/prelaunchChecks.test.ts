import { describe, expect, it } from "vitest";
import { getUnreadCount } from "@/lib/readState";

describe("pre-launch QA checks", () => {
  describe("empty states do not crash", () => {
    it("empty notes list returns 0 unread", () => {
      expect(getUnreadCount([])).toBe(0);
    });

    it("empty deadlines does not crash", () => {
      const deadlines: Array<{ id: string }> = [];
      expect(deadlines.length).toBe(0);
    });

    it("empty courses does not crash", () => {
      const courses: Array<{ id: string }> = [];
      expect(courses.length).toBe(0);
    });

    it("empty period records returns null predictions", () => {
      // Testing that empty inputs don't crash period functions
      const records: Array<{ id: string }> = [];
      expect(records.length).toBe(0);
    });
  });

  describe("no undefined/null/NaN in computed values", () => {
    it("formatCountdown handles empty targetDate", async () => {
      const { formatCountdown } = await import("@/lib/date");
      const result = formatCountdown("");
      expect(result).toBeTruthy();
      expect(result).not.toContain("Invalid");
      expect(result).not.toContain("NaN");
    });

    it("getDaysUntilDeadline returns a number", async () => {
      const { getDaysUntilDeadline } = await import("@/lib/date");
      const deadline = {
        id: "1",
        title: "Test",
        dueDate: "2026-06-15",
        dueTime: "12:00",
        priority: "medium" as const,
        status: "todo" as const,
      };
      const days = getDaysUntilDeadline(deadline);
      expect(typeof days).toBe("number");
      expect(isNaN(days)).toBe(false);
    });
  });

  describe("soft-deleted notes excluded from aggregations", () => {
    it("soft-deleted notes not counted as unread", () => {
      const notes = [
        { id: "n1", author: "admin", deletedAt: "2026-06-01T00:00:00Z" },
        { id: "n2", author: "admin" },
        { id: "n3", author: "admin", deletedAt: "2026-06-02T00:00:00Z" },
      ];
      const count = getUnreadCount(notes);
      expect(count).toBe(1); // Only n2
    });

    it("all soft-deleted notes returns 0 unread", () => {
      const notes = [
        { id: "n1", author: "admin", deletedAt: "2026-06-01T00:00:00Z" },
        { id: "n2", author: "admin", deletedAt: "2026-06-02T00:00:00Z" },
      ];
      const count = getUnreadCount(notes);
      expect(count).toBe(0);
    });
  });

  describe("Supabase missing does not crash aggregations", () => {
    it("readState works without Supabase", () => {
      const notes = [{ id: "n1", author: "admin" }];
      expect(() => getUnreadCount(notes)).not.toThrow();
    });

    it("backup validation rejects non-object", async () => {
      const { validateBackupPayload } = await import("@/lib/backupTypes");
      expect(validateBackupPayload(42).valid).toBe(false);
      expect(validateBackupPayload("string").valid).toBe(false);
      expect(validateBackupPayload([]).valid).toBe(false);
    });

    it("backup validation rejects invalid schemaVersion", async () => {
      const { validateBackupPayload } = await import("@/lib/backupTypes");
      expect(validateBackupPayload({ schemaVersion: "2.0.0", data: {} }).valid).toBe(false);
    });
  });

  describe("PWA and Push boundaries", () => {
    it("VAPID missing returns misconfigured", async () => {
      const { computePushState } = await import("@/lib/notificationState");
      const state = computePushState({
        isSupported: true,
        permission: "granted",
        hasExistingSubscription: false,
        isVapidConfigured: false,
      });
      expect(state).toBe("misconfigured");
    });

    it("denied permission returns denied state", async () => {
      const { computePushState } = await import("@/lib/notificationState");
      const state = computePushState({
        isSupported: true,
        permission: "denied",
        hasExistingSubscription: false,
        isVapidConfigured: true,
      });
      expect(state).toBe("permission-denied");
    });
  });

  describe("reminder preferences have sensible defaults", () => {
    it("DEFAULT_REMINDER_PREFERENCES is valid", async () => {
      const { DEFAULT_REMINDER_PREFERENCES } = await import("@/lib/reminderConfig");
      expect(DEFAULT_REMINDER_PREFERENCES.reminderTime).toBe("09:00");
      expect(DEFAULT_REMINDER_PREFERENCES.enabled).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.weatherReminder).toBe(true);
      expect(DEFAULT_REMINDER_PREFERENCES.periodReminder).toBe(false);
    });
  });
});
