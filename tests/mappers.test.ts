import { describe, expect, it } from "vitest";
import {
  courseFromRow,
  courseToRow,
  deadlineFromRow,
  deadlineToRow,
  loveNoteFromRow,
  loveNoteToRow,
  cloudSettingsToRows,
  quickLinkFromRow,
  quickLinkToRow,
  settingsRowsToCloudSettings
} from "@/lib/mappers";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("mappers", () => {
  it("maps Course camelCase and snake_case", () => {
    const row = courseToRow({ id: uuid, name: "Seminar", day: "Monday", startTime: "09:00", endTime: "10:00" }, "space");
    expect(row.start_time).toBe("09:00");
    expect(courseFromRow({ id: uuid, name: "Seminar", day: "Monday", start_time: "09:00", end_time: "10:00" }).startTime).toBe("09:00");
  });

  it("maps LoveNote media camelCase to snake_case", () => {
    const row = loveNoteToRow({
      content: "voice",
      active: true,
      pinned: false,
      author: "me",
      noteType: "audio",
      displayStyle: "bubble",
      audioUrl: "https://example.com/a.webm",
      audioPath: "xiaoguai520/audio/a.webm",
      videoUrl: "https://example.com/a.mp4",
      videoPath: "xiaoguai520/videos/a.mp4",
      mediaSize: 456
    }, "space");
    expect(row.audio_url).toBe("https://example.com/a.webm");
    expect(row.video_url).toBe("https://example.com/a.mp4");
    expect(row.display_style).toBe("bubble");
    expect(row.note_type).toBe("audio");
    expect(row.media_size).toBe(456);
  });

  it("maps Deadline camelCase and snake_case", () => {
    const row = deadlineToRow({ id: uuid, title: "Essay", courseName: "Methods", dueDate: "2026-06-01", priority: "high", status: "todo" }, "space");
    expect(row.course_name).toBe("Methods");
    expect(deadlineFromRow({ id: uuid, title: "Essay", course_name: "Methods", due_date: "2026-06-01", priority: "high", status: "todo" }).courseName).toBe("Methods");
  });

  it("maps LoveNote image fields", () => {
    const note = loveNoteFromRow({
      id: uuid,
      content: "hello",
      active: true,
      pinned: true,
      author: "xiaoguai",
      note_type: "mixed",
      display_style: "postcard",
      mood: "想你",
      image_url: "https://example.com/a.jpg",
      image_path: "xiaoguai520/a.jpg",
      image_alt: "photo",
      audio_url: "https://example.com/a.webm",
      audio_path: "xiaoguai520/audio/a.webm",
      video_url: "https://example.com/a.mp4",
      video_path: "xiaoguai520/videos/a.mp4",
      media_size: 123,
      deleted_at: "2026-05-25T12:00:00Z"
    });
    expect(note.imageUrl).toBe("https://example.com/a.jpg");
    expect(note.imagePath).toBe("xiaoguai520/a.jpg");
    expect(note.imageAlt).toBe("photo");
    expect(note.audioUrl).toBe("https://example.com/a.webm");
    expect(note.videoUrl).toBe("https://example.com/a.mp4");
    expect(note.displayStyle).toBe("postcard");
    expect(note.noteType).toBe("mixed");
    expect(note.mediaSize).toBe(123);
    expect(note.deletedAt).toBe("2026-05-25T12:00:00Z");
  });

  it("maps QuickLink sortOrder", () => {
    const row = quickLinkToRow({ id: uuid, title: "Bristol", url: "https://example.com", category: "study", sortOrder: 3 }, "space");
    expect(row.sort_order).toBe(3);
    expect(quickLinkFromRow({ id: uuid, title: "Bristol", url: "https://example.com", sort_order: 2 }).sortOrder).toBe(2);
  });

  it("maps background_settings through cloud settings rows", () => {
    const rows = cloudSettingsToRows({ backgroundSettings: { mode: "preset", preset: "blue" } }, "space");
    expect(rows.find((row) => row.key === "background_settings")?.value).toMatchObject({ mode: "preset", preset: "blue" });
    expect(settingsRowsToCloudSettings([{ key: "background_settings", value: { mode: "color", color: "#FDF2F8" } }]).backgroundSettings).toMatchObject({
      mode: "color",
      color: "#FDF2F8"
    });
  });
});
