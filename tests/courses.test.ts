import { describe, it, expect } from "vitest";
import { courseFromRow, courseToRow } from "@/lib/mappers";
import { normalizeLocalData } from "@/lib/uploadNormalize";
import type { Course } from "@/lib/types";

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "测试课程",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:30",
    location: "教室A",
    teacher: "张老师",
    note: "带课本",
    color: "#f7b6a6",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("courseFromRow / courseToRow round-trip", () => {
  it("should preserve all fields", () => {
    const course = makeCourse();
    const row = courseToRow(course, "space-id");
    const roundTripped = courseFromRow(row as unknown as Parameters<typeof courseFromRow>[0]);

    expect(roundTripped.id).toBe(course.id);
    expect(roundTripped.name).toBe(course.name);
    expect(roundTripped.day).toBe(course.day);
    expect(roundTripped.startTime).toBe(course.startTime);
    expect(roundTripped.endTime).toBe(course.endTime);
    expect(roundTripped.location).toBe(course.location);
    expect(roundTripped.teacher).toBe(course.teacher);
    expect(roundTripped.note).toBe(course.note);
    expect(roundTripped.color).toBe(course.color);
  });

  it("should preserve createdAt/updatedAt/deletedAt", () => {
    const course = makeCourse({
      deletedAt: "2026-02-01T00:00:00.000Z"
    });
    const row = courseToRow(course, "space-id");
    const roundTripped = courseFromRow(row as unknown as Parameters<typeof courseFromRow>[0]);

    expect(roundTripped.createdAt).toBe(course.createdAt);
    expect(roundTripped.updatedAt).toBeDefined();
    expect(roundTripped.deletedAt).toBe(course.deletedAt);
  });

  it("should handle null values gracefully", () => {
    const course = makeCourse({ location: undefined, teacher: undefined, note: undefined, color: undefined });
    const row = courseToRow(course, "space-id");
    expect(row.location).toBeNull();
    expect(row.teacher).toBeNull();
    expect(row.note).toBeNull();
    expect(row.color).toBe("rose");
  });

  it("should set deleted_at to null when no deletedAt", () => {
    const course = makeCourse({ deletedAt: undefined });
    const row = courseToRow(course, "space-id");
    expect(row.deleted_at).toBeNull();
  });
});

describe("courseToRow db column names", () => {
  it("should use correct db column names", () => {
    const course = makeCourse();
    const row = courseToRow(course, "space-id");
    expect(row).toHaveProperty("name");
    expect(row).toHaveProperty("day");
    expect(row).toHaveProperty("start_time");
    expect(row).toHaveProperty("end_time");
    expect(row).toHaveProperty("location");
    expect(row).toHaveProperty("teacher");
    expect(row).toHaveProperty("note");
    expect(row).toHaveProperty("color");
    expect(row).toHaveProperty("created_at");
    expect(row).toHaveProperty("updated_at");
    expect(row).toHaveProperty("deleted_at");
    expect(row).toHaveProperty("space_id");
  });
});

describe("normalizeLocalData - courses handling", () => {
  it("should extract courses from data.courses", () => {
    const result = normalizeLocalData({
      courses: [makeCourse()]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].name).toBe("测试课程");
  });

  it("should extract courses from data.schedule (backward compat)", () => {
    const result = normalizeLocalData({
      schedule: [makeCourse({ id: "sch-1" })]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].id).toBe("sch-1");
  });

  it("should merge courses+schedule without duplicates", () => {
    const course = makeCourse();
    const result = normalizeLocalData({
      courses: [course],
      schedule: [makeCourse({ id: "sch-extra" })]
    });
    expect(result.courses).toHaveLength(2);
  });

  it("should return empty array when no courses data", () => {
    const result = normalizeLocalData({});
    expect(result.courses).toEqual([]);
  });

  it("should handle undefined courses", () => {
    const result = normalizeLocalData({ courses: undefined });
    expect(result.courses).toEqual([]);
  });

  it("should handle null courses", () => {
    const result = normalizeLocalData({ courses: null });
    expect(result.courses).toEqual([]);
  });

  it("should filter out invalid courses", () => {
    const result = normalizeLocalData({
      courses: [
        makeCourse(),
        { id: "invalid", name: "", day: "Monday", startTime: "09:00", endTime: "10:00" },
        { id: "no-name", startTime: "09:00", endTime: "10:00" },
        null,
        undefined,
        "string",
        123
      ] as unknown as Record<string, unknown>[]
    });
    expect(result.courses).toHaveLength(1);
  });

  it("should preserve timestamps through normalizeLocalData", () => {
    const result = normalizeLocalData({
      courses: [makeCourse({
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-15T00:00:00.000Z",
        deletedAt: "2026-04-01T00:00:00.000Z"
      })]
    });
    expect(result.courses[0].createdAt).toBe("2026-03-01T00:00:00.000Z");
    expect(result.courses[0].updatedAt).toBe("2026-03-15T00:00:00.000Z");
    expect(result.courses[0].deletedAt).toBe("2026-04-01T00:00:00.000Z");
  });

  it("should auto-generate id for courses missing id", () => {
    const result = normalizeLocalData({
      courses: [{ name: "无ID课程", day: "Monday", startTime: "09:00", endTime: "10:00" } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].id).toBeDefined();
    expect(typeof result.courses[0].id).toBe("string");
  });

  it("should compatible with title field (legacy)", () => {
    const result = normalizeLocalData({
      courses: [{ title: "旧字段课程", day: "Tuesday", startTime: "10:00", endTime: "11:00" } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].name).toBe("旧字段课程");
  });

  it("should compatible with weekday field (legacy)", () => {
    const result = normalizeLocalData({
      courses: [{
        name: "旧星期字段",
        weekday: "Wednesday",
        startTime: "09:00",
        endTime: "10:00"
      } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].day).toBe("Wednesday");
  });

  it("should compatible with dayOfWeek field (legacy)", () => {
    const result = normalizeLocalData({
      courses: [{
        name: "旧星期字段2",
        dayOfWeek: "Thursday",
        startTime: "09:00",
        endTime: "10:00"
      } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].day).toBe("Thursday");
  });

  it("should compatible with room field (legacy)", () => {
    const result = normalizeLocalData({
      courses: [{
        name: "旧地点",
        day: "Friday",
        startTime: "09:00",
        endTime: "10:00",
        room: "B201"
      } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].location).toBe("B201");
  });

  it("should compatible with notes field (legacy)", () => {
    const result = normalizeLocalData({
      courses: [{
        name: "旧备注",
        day: "Monday",
        startTime: "09:00",
        endTime: "10:00",
        notes: "旧备注字段"
      } as unknown as Record<string, unknown>]
    });
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].note).toBe("旧备注字段");
  });
});

describe("upload payload contains courses", () => {
  it("should include courses in upload payload", () => {
    const course = makeCourse();
    const normalized = normalizeLocalData({ courses: [course] });
    expect(normalized.courses).toHaveLength(1);
    // All fields should be ready for courseToRow
    const row = courseToRow(normalized.courses[0], "test-space");
    expect(row.name).toBe(normalized.courses[0].name);
    expect(row.day).toBe(normalized.courses[0].day);
    expect(row.start_time).toBe(normalized.courses[0].startTime);
    expect(row.end_time).toBe(normalized.courses[0].endTime);
    expect(row.deleted_at).toBeNull();
  });

  it("should include deletedAt in upload payload if present", () => {
    const normalized = normalizeLocalData({
      courses: [makeCourse({ deletedAt: "2026-05-01T00:00:00.000Z" })]
    });
    const row = courseToRow(normalized.courses[0], "test-space");
    expect(row.deleted_at).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("fetchCloudDataByCode pulls courses", () => {
  it("courseFromRow returns undefined for missing optional fields", () => {
    const minimal = courseFromRow({
      id: "test-1",
      name: "最小课程",
      day: "Monday",
      start_time: "09:00",
      end_time: "10:30"
    } as unknown as Parameters<typeof courseFromRow>[0]);
    expect(minimal.id).toBe("test-1");
    expect(minimal.name).toBe("最小课程");
    expect(minimal.day).toBe("Monday");
    expect(minimal.startTime).toBe("09:00");
    expect(minimal.endTime).toBe("10:30");
    expect(minimal.location).toBeUndefined();
    expect(minimal.teacher).toBeUndefined();
    expect(minimal.note).toBeUndefined();
    expect(minimal.deletedAt).toBeUndefined();
  });

  it("courseFromRow handles deleted_at", () => {
    const withDeleted = courseFromRow({
      id: "test-2",
      name: "已删课程",
      day: "Tuesday",
      start_time: "10:00",
      end_time: "11:00",
      deleted_at: "2026-06-01T00:00:00.000Z"
    } as unknown as Parameters<typeof courseFromRow>[0]);
    expect(withDeleted.deletedAt).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("course sync through uploadNormalize preserve all fields", () => {
  it("should preserve all course fields through normalizeLocalData", () => {
    const original = makeCourse({
      location: "主楼301",
      teacher: "Prof. Smith",
      note: "带上作业",
      color: "#ff0000"
    });

    const normalized = normalizeLocalData({
      courses: [original]
    });

    expect(normalized.courses[0]).toEqual(original);
  });
});