import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

    expect(rows.find((row) => row.key === "app_settings")?.value).toMatchObject({
      girlfriendName: "小乖",
      nextMeetingDate: "",
      semesterEndDate: ""
    });
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

    // ID is now always UUID — non-UUID ids replaced by ensureUuid before row building
    expect(row.id).toBeDefined();
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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

  it("cloud upload route does not batch insert love notes or album media", () => {
    const source = readFileSync(new URL("../app/api/cloud/upload/route.ts", import.meta.url), "utf8");
    expect(source).not.toContain("loveNoteToRow");
    expect(source).not.toContain(".from(\"love_notes\").insert");
    expect(source).not.toContain("album_items");
    expect(source).not.toContain("storage.from");
  });

  it("cloud upload includes deadlines and does not proactively sync retired links", () => {
    const source = readFileSync(new URL("../app/api/cloud/upload/route.ts", import.meta.url), "utf8");
    expect(source).toContain('supabase.from("deadlines").insert');
    expect(source).not.toContain('supabase.from("quick_links")');
  });
});