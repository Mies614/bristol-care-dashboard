import { describe, expect, it } from "vitest";
import {
  createAllDeadlinesIcs,
  createCourseIcs,
  createDeadlineIcs,
  escapeIcsText,
  formatIcsDate
} from "@/lib/ics";
import type { Course, Deadline } from "@/lib/types";

const course: Course = {
  id: "course-1",
  name: "Research, Methods; Seminar",
  day: "Monday",
  startTime: "09:00",
  endTime: "10:30",
  location: "",
  teacher: "Dr. Taylor"
};

const deadline: Deadline = {
  id: "ddl-1",
  title: "Essay draft",
  courseName: "Methods",
  dueDate: "2026-06-01",
  dueTime: "12:00",
  priority: "high",
  status: "todo",
  note: "Check references"
};

describe("ics helpers", () => {
  it("escapes comma, semicolon and newline", () => {
    expect(escapeIcsText("a,b;c\nd")).toBe("a\\,b\\;c\\nd");
  });

  it("formats UTC dates", () => {
    expect(formatIcsDate(new Date(Date.UTC(2026, 4, 25, 9, 8, 7)))).toBe("20260525T090807Z");
  });

  it("creates weekly course recurrence", () => {
    const ics = createCourseIcs(course, { now: new Date("2026-05-25T00:00:00Z") });
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
  });

  it("creates course reminders at 30 and 10 minutes", () => {
    const ics = createCourseIcs(course, { now: new Date("2026-05-25T00:00:00Z") });
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("TRIGGER:-PT10M");
  });

  it("handles a course without location", () => {
    expect(() => createCourseIcs(course)).not.toThrow();
    expect(createCourseIcs(course)).toContain("LOCATION:");
  });

  it("creates deadline title", () => {
    expect(createDeadlineIcs(deadline)).toContain("SUMMARY:DDL：Essay draft");
  });

  it("creates deadline reminders at 3 days and 1 day", () => {
    const ics = createDeadlineIcs(deadline);
    expect(ics).toContain("TRIGGER:-P3D");
    expect(ics).toContain("TRIGGER:-P1D");
  });

  it("excludes completed deadlines from bulk export", () => {
    const done = { ...deadline, id: "ddl-2", status: "done" as const };
    const ics = createAllDeadlinesIcs([deadline, done]);
    expect(ics).toContain("Essay draft");
    expect(ics).not.toContain("deadline-ddl-2");
  });
});
