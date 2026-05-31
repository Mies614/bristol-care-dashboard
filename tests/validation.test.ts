import { describe, expect, it } from "vitest";
import { validateAppData, validateCourseArray } from "@/lib/validation";

describe("import validation", () => {
  it("accepts exported course arrays", () => {
    const courses = validateCourseArray([
      {
        id: "1",
        name: "Seminar",
        day: "Monday",
        startTime: "09:00",
        endTime: "10:00"
      }
    ]);

    expect(courses).toHaveLength(1);
  });

  it("rejects malformed course arrays", () => {
    expect(() => validateCourseArray([{ title: "wrong" }])).toThrow("课程表 JSON 格式不正确");
  });

  it("accepts complete exported app data", () => {
    const data = validateAppData({
      nickname: "小乖",
      nextMeetDate: "",
      note: "hello",
      courses: [],
      deadlines: [],
      links: []
    });

    expect(data.nickname).toBe("小乖");
  });

  it("repairs incomplete app data without throwing", () => {
    const data = validateAppData({ nickname: "小乖" });
    // With lenient validation, missing fields get fallback defaults
    expect(data.nickname).toBe("小乖");
    expect(Array.isArray(data.courses)).toBe(true);
    expect(Array.isArray(data.deadlines)).toBe(true);
    expect(Array.isArray(data.links)).toBe(true);
  });
});