import { describe, expect, it } from "vitest";
import { getNextCourse, getTodayCourses } from "@/lib/schedule";
import type { Course } from "@/lib/types";

const courses: Course[] = [
  { id: "1", name: "Morning", day: "Monday", startTime: "09:00", endTime: "10:00" },
  { id: "2", name: "Afternoon", day: "Monday", startTime: "14:00", endTime: "15:00" },
  { id: "3", name: "Other", day: "Tuesday", startTime: "11:00", endTime: "12:00" }
];

describe("schedule helpers", () => {
  it("filters today's courses", () => {
    const today = getTodayCourses(courses, new Date("2026-05-25T08:00:00"));

    expect(today.map((course) => course.name)).toEqual(["Morning", "Afternoon"]);
  });

  it("calculates next course", () => {
    const next = getNextCourse(courses, new Date("2026-05-25T10:30:00"));

    expect(next?.name).toBe("Afternoon");
  });
});
