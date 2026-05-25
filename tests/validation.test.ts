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

  it("rejects incomplete app data", () => {
    expect(() => validateAppData({ nickname: "小乖" })).toThrow("数据 JSON 缺少课程");
  });
});
