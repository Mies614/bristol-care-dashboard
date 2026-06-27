import { describe, expect, it } from "vitest";
import { hasNoteContent, inferNoteType, normalizeDisplayStyle, normalizeNoteAuthor } from "@/lib/noteValidation";

describe("note validation", () => {
  it("requires at least content or one media URL", () => {
    expect(hasNoteContent({})).toBe(false);
    expect(hasNoteContent({ content: "hello" })).toBe(true);
    expect(hasNoteContent({ imageUrl: "https://example.com/a.jpg" })).toBe(true);
    expect(hasNoteContent({ audioUrl: "https://example.com/a.webm" })).toBe(true);
    expect(hasNoteContent({ videoUrl: "https://example.com/a.mp4" })).toBe(true);
  });

  it("detects media paths (not just URLs)", () => {
    expect(hasNoteContent({ imagePath: "a/b/c.jpg" })).toBe(true);
    expect(hasNoteContent({ audioPath: "a/b/c.m4a" })).toBe(true);
    expect(hasNoteContent({ videoPath: "a/b/c.mp4" })).toBe(true);
    expect(hasNoteContent({})).toBe(false);
  });

  it("infers note types", () => {
    expect(inferNoteType({ content: "hello" })).toBe("text");
    expect(inferNoteType({ imageUrl: "x" })).toBe("image");
    expect(inferNoteType({ audioUrl: "x" })).toBe("audio");
    expect(inferNoteType({ videoUrl: "x" })).toBe("video");
    expect(inferNoteType({ content: "hello", imageUrl: "x" })).toBe("mixed");
    expect(inferNoteType({ imagePath: "a.jpg" })).toBe("image");
    expect(inferNoteType({ audioPath: "a.m4a" })).toBe("audio");
    expect(inferNoteType({ videoPath: "a.mp4" })).toBe("video");
  });

  it("normalizes display style and author", () => {
    expect(normalizeDisplayStyle("postcard")).toBe("postcard");
    expect(normalizeDisplayStyle("minimal")).toBe("minimal");
    expect(normalizeDisplayStyle("romantic")).toBe("romantic");
    expect(normalizeDisplayStyle("unknown")).toBe("sticky");
    expect(normalizeNoteAuthor("me")).toBe("me");
    expect(normalizeNoteAuthor(undefined)).toBe("xiaoguai");
  });
});
