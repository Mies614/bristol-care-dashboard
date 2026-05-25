import { describe, expect, it } from "vitest";
import { courseToRow, deadlineToRow, loveNoteToRow, quickLinkToRow } from "@/lib/mappers";
import { buildSettingsRows, isUuid, normalizeLocalData, omitInvalidUuidId } from "@/lib/uploadNormalize";

describe("normalizeLocalData", () => {
  it("supports nickname, nextMeetDate and note", () => {
    const normalized = normalizeLocalData({
      nickname: "小乖",
      nextMeetDate: "2026-06-01",
      note: "今天也要好好吃饭"
    });

    expect(normalized.settings.girlfriendName).toBe("小乖");
    expect(normalized.settings.nextMeetingDate).toBe("2026-06-01");
    expect(normalized.loveNotes[0].content).toBe("今天也要好好吃饭");
    expect(normalized.loveNotes[0].active).toBe(true);
    expect(normalized.loveNotes[0].pinned).toBe(true);
  });

  it("normalizes empty string dates to null before row building", () => {
    const normalized = normalizeLocalData({
      nextMeetDate: "",
      semesterEndDate: "",
      settings: { nextMeetingDate: "", semesterEndDate: "" }
    });

    expect(normalized.settings.nextMeetingDate).toBeNull();
    expect(normalized.settings.semesterEndDate).toBeNull();
  });

  it("builds settings rows with present non-undefined values", () => {
    const normalized = normalizeLocalData({
      nextMeetDate: "",
      semesterEndDate: "",
      settings: {}
    });
    const rows = buildSettingsRows(normalized.settings, "space-id");

    expect(rows.find((row) => row.key === "girlfriend_name")?.value).toBe("小乖");
    expect(rows.find((row) => row.key === "next_meeting_date")).toHaveProperty("value", "");
    expect(rows.find((row) => row.key === "semester_end_date")).toHaveProperty("value", "");
    expect(rows.every((row) => Object.prototype.hasOwnProperty.call(row, "value"))).toBe(true);
    expect(rows.every((row) => row.value !== undefined)).toBe(true);
    expect(rows.every((row) => row.value !== null)).toBe(true);
    expect(rows.find((row) => row.key === "background_settings")?.value).toMatchObject({ mode: "preset", preset: "cream" });
  });

  it("includes background_settings in cloud settings rows", () => {
    const normalized = normalizeLocalData({
      backgroundSettings: { mode: "url", imageUrl: "https://example.com/bg.webp", overlay: "strong" }
    });
    const rows = buildSettingsRows(normalized.settings, "space-id");
    const backgroundRow = rows.find((row) => row.key === "background_settings");

    expect(backgroundRow).toBeDefined();
    expect(backgroundRow?.value).toMatchObject({ mode: "url", imageUrl: "https://example.com/bg.webp", overlay: "strong" });
    expect(backgroundRow?.value).not.toBeNull();
  });

  it("removes non-uuid ids before database insert", () => {
    expect(isUuid("course-1")).toBe(false);
    expect(omitInvalidUuidId({ id: "course-1", name: "A" })).toEqual({ name: "A" });
  });

  it("maps course fields to snake_case", () => {
    const normalized = normalizeLocalData({
      courses: [{ id: "course-1", name: "Seminar", day: "Monday", startTime: "09:00", endTime: "10:00" }]
    });
    const row = courseToRow(normalized.courses[0], "space");

    expect(row).not.toHaveProperty("id");
    expect(row.start_time).toBe("09:00");
    expect(row.end_time).toBe("10:00");
  });

  it("maps deadline, quickLink and loveNote fields correctly", () => {
    const normalized = normalizeLocalData({
      deadlines: [{ id: "deadline-1", title: "Essay", courseName: "Methods", dueDate: "2026-06-01", dueTime: "12:00", priority: "high", status: "todo" }],
      links: [{ id: "link-1", title: "Bristol", url: "https://example.com", sortOrder: 2 }],
      loveNotes: [{ id: "note-1", content: "hello", active: true, pinned: false, visibleFrom: "2026-05-25T00:00:00Z", imageUrl: "https://example.com/a.jpg" }]
    });

    expect(deadlineToRow(normalized.deadlines[0], "space").course_name).toBe("Methods");
    expect(deadlineToRow(normalized.deadlines[0], "space").due_date).toBe("2026-06-01");
    expect(quickLinkToRow(normalized.quickLinks[0], "space").sort_order).toBe(2);
    expect(loveNoteToRow(normalized.loveNotes[0], "space").visible_from).toBe("2026-05-25T00:00:00Z");
    expect(loveNoteToRow(normalized.loveNotes[0], "space").image_url).toBe("https://example.com/a.jpg");
  });
});
