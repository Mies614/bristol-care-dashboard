import { describe, expect, it } from "vitest";
import {
  isWithinReminderWindow,
  scheduleReminders,
  type ServerReminderPreference,
  type ReminderDeliveryRecord,
  type SpaceData,
} from "@/lib/serverReminderScheduler";

function makePref(overrides: Partial<ServerReminderPreference> = {}): ServerReminderPreference {
  return {
    spaceCode: "test",
    identity: "default",
    enabled: true,
    weatherEnabled: true,
    deadlineEnabled: true,
    missYouEnabled: true,
    periodEnabled: true,
    reminderTime: "09:00",
    timezone: "Europe/London",
    ...overrides,
  };
}

function makeSpaceData(overrides: Partial<SpaceData> = {}): SpaceData {
  return {
    spaceCode: "test",
    deadlines: [],
    nextMeetDate: null,
    nickname: "小乖",
    periodDaysUntilNext: null,
    periodCycleDay: null,
    ...overrides,
  };
}

describe("isWithinReminderWindow", () => {
  it("returns true when at the exact scheduled time", () => {
    const now = new Date("2026-06-15T09:00:00Z");
    expect(isWithinReminderWindow(now, "09:00")).toBe(true);
  });

  it("returns true 5 minutes before", () => {
    const now = new Date("2026-06-15T08:55:00Z");
    expect(isWithinReminderWindow(now, "09:00")).toBe(true);
  });

  it("returns true 10 minutes after", () => {
    const now = new Date("2026-06-15T09:10:00Z");
    expect(isWithinReminderWindow(now, "09:00")).toBe(true);
  });

  it("returns false 20 minutes after", () => {
    const now = new Date("2026-06-15T09:20:00Z");
    expect(isWithinReminderWindow(now, "09:00")).toBe(false);
  });

  it("returns false 10 minutes before", () => {
    const now = new Date("2026-06-15T08:50:00Z");
    expect(isWithinReminderWindow(now, "09:00")).toBe(false);
  });

  it("returns false for invalid reminder_time", () => {
    const now = new Date("2026-06-15T09:00:00Z");
    expect(isWithinReminderWindow(now, "invalid")).toBe(false);
    expect(isWithinReminderWindow(now, "")).toBe(false);
  });

  it("handles different hour", () => {
    const now = new Date("2026-06-15T15:00:00Z");
    expect(isWithinReminderWindow(now, "15:00")).toBe(true);
    expect(isWithinReminderWindow(now, "09:00")).toBe(false);
  });
});

describe("scheduleReminders", () => {
  it("skips when no preferences", () => {
    const result = scheduleReminders({
      preferences: [],
      spacesData: [],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications).toHaveLength(0);
  });

  it("skips when disabled", () => {
    const result = scheduleReminders({
      preferences: [makePref({ enabled: false })],
      spacesData: [makeSpaceData()],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications).toHaveLength(0);
    expect(result.skipped.some((s) => s.reason === "reminder_disabled")).toBe(true);
  });

  it("skips when outside time window", () => {
    const result = scheduleReminders({
      preferences: [makePref({ reminderTime: "09:00" })],
      spacesData: [makeSpaceData()],
      deliveryLog: [],
      now: new Date("2026-06-15T14:00:00Z"),
    });
    expect(result.notifications).toHaveLength(0);
    expect(result.skipped.some((s) => s.reason === "outside_time_window")).toBe(true);
  });

  it("generates weather reminder", () => {
    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({
        weather: { temperature: 15, apparentTemperature: 14, weatherCode: 2, windSpeed: 10, rainProbability: 20, maxTemperature: 18, minTemperature: 10, sunrise: "05:00", sunset: "21:00" },
      })],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications.some((n) => n.payload.type === "weather")).toBe(true);
  });

  it("generates deadline reminder for nearby deadline", () => {
    const tomorrow = new Date("2026-06-15T09:00:00Z");
    const dueDate = "2026-06-17"; // 2 days from June 15

    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({
        deadlines: [{ id: "d1", title: "Essay", dueDate, dueTime: "23:59", priority: "high", status: "todo" }],
      })],
      deliveryLog: [],
      now: tomorrow,
    });
    expect(result.notifications.some((n) => n.payload.type === "deadline")).toBe(true);
  });

  it("skips deadline outside 1-3 day range", () => {
    const now = new Date("2026-06-15T09:00:00Z");
    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({
        deadlines: [{ id: "d1", title: "Far", dueDate: "2026-07-01", dueTime: "23:59", priority: "low", status: "todo" }],
      })],
      deliveryLog: [],
      now,
    });
    expect(result.skipped.some((s) => s.reason === "deadline_outside_range")).toBe(true);
  });

  it("generates miss-you reminder", () => {
    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({ nextMeetDate: "2026-06-20" })],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications.some((n) => n.payload.type === "miss_you")).toBe(true);
  });

  it("generates period reminder when data available", () => {
    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({ periodDaysUntilNext: 3, periodCycleDay: 25 })],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications.some((n) => n.payload.type === "period")).toBe(true);
  });

  it("does not duplicate already-sent reminders", () => {
    const deliveryLog: ReminderDeliveryRecord[] = [
      { spaceCode: "test", identity: "default", reminderType: "weather", deliveryDate: "2026-06-15" },
    ];

    const result = scheduleReminders({
      preferences: [makePref()],
      spacesData: [makeSpaceData({
        weather: { temperature: 15, apparentTemperature: 14, weatherCode: 2, windSpeed: 10, rainProbability: 20, maxTemperature: 18, minTemperature: 10, sunrise: "05:00", sunset: "21:00" },
      })],
      deliveryLog,
      now: new Date("2026-06-15T09:00:00Z"),
    });

    // Weather should be skipped (already sent) but other types may generate
    const weatherNotifs = result.notifications.filter((n) => n.payload.type === "weather");
    expect(weatherNotifs).toHaveLength(0);
    expect(result.skipped.some((s) => s.reason === "weather_already_sent")).toBe(true);
  });

  it("handles missing space data gracefully", () => {
    const result = scheduleReminders({
      preferences: [makePref({ spaceCode: "nonexistent" })],
      spacesData: [makeSpaceData({ spaceCode: "other" })],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(result.notifications).toHaveLength(0);
    expect(result.skipped.some((s) => s.reason === "space_data_not_found")).toBe(true);
  });

  it("returns structured skipped array", () => {
    const result = scheduleReminders({
      preferences: [makePref({ reminderTime: "15:00" })],
      spacesData: [],
      deliveryLog: [],
      now: new Date("2026-06-15T09:00:00Z"),
    });
    expect(Array.isArray(result.skipped)).toBe(true);
    expect(result.skipped.every((s) => typeof s.reason === "string" && typeof s.count === "number")).toBe(true);
  });
});
