import { describe, expect, it } from "vitest";
import {
  getCourseReminders,
  getDeadlineReminders,
  getPeriodReminders,
  getTodayPriorityReminders
} from "@/lib/priorityReminders";
import { getActiveNavHref } from "@/lib/navigation";
import type { Course, Deadline, PeriodRecord } from "@/lib/types";

const now = new Date(2026, 4, 26, 9, 30, 0);

function deadline(overrides: Partial<Deadline>): Deadline {
  return {
    id: "d1",
    title: "Essay",
    dueDate: "2026-05-26",
    dueTime: "23:59",
    priority: "medium",
    status: "todo",
    ...overrides
  };
}

function course(overrides: Partial<Course>): Course {
  return {
    id: "c1",
    name: "Seminar",
    day: "Tuesday",
    startTime: "10:15",
    endTime: "11:00",
    ...overrides
  };
}

describe("priority reminders", () => {
  it("marks today and overdue deadlines as urgent", () => {
    expect(getDeadlineReminders([deadline({})], now)[0].priority).toBe("urgent");
    expect(getDeadlineReminders([deadline({ dueDate: "2026-05-25" })], now)[0].priority).toBe("urgent");
    expect(getDeadlineReminders([deadline({})], now)[0].careText).toContain("关键");
  });

  it("marks deadlines within 3 days as soon", () => {
    expect(getDeadlineReminders([deadline({ dueDate: "2026-05-28" })], now)[0].priority).toBe("soon");
  });

  it("excludes completed deadlines", () => {
    expect(getDeadlineReminders([deadline({ status: "done" })], now)).toEqual([]);
  });

  it("marks courses within 1 hour as urgent and later today as soon", () => {
    expect(getCourseReminders([course({ startTime: "10:15" })], now)[0].priority).toBe("urgent");
    expect(getCourseReminders([course({ startTime: "13:00" })], now)[0].priority).toBe("soon");
    expect(getCourseReminders([course({ startTime: "13:00" })], now)[0].careText).toContain("带好");
  });

  it("marks period expected within 2 days as soon", () => {
    const records: PeriodRecord[] = [{ id: "p1", startDate: "2026-04-30" }];
    expect(getPeriodReminders(records, { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 }, now)[0].priority).toBe("soon");
    expect(getPeriodReminders(records, { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 }, now)[0].careText).toContain("身体");
  });

  it("sorts merged reminders with urgent first", () => {
    const reminders = getTodayPriorityReminders({
      courses: [course({ startTime: "13:00" })],
      deadlines: [deadline({ dueDate: "2026-05-26" })],
      periodRecords: [{ id: "p1", startDate: "2026-04-30" }],
      periodSettings: { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 },
      now
    });
    expect(reminders[0].priority).toBe("urgent");
  });

  it("returns info fallback for empty period data", () => {
    expect(getPeriodReminders([], { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 }, now)[0].priority).toBe("info");
  });

  it("maps detail routes to grouped nav entries", () => {
    expect(getActiveNavHref("/schedule")).toBe("/notes");
    expect(getActiveNavHref("/deadlines")).toBe("/notes");
    expect(getActiveNavHref("/period")).toBe("/notes");
    expect(getActiveNavHref("/notes")).toBe("/notes");
    expect(getActiveNavHref("/albums")).toBe("/albums");
  });
});
