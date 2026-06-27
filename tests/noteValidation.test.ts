import { describe, expect, it } from "vitest";
import { hasNoteContent, inferNoteType, normalizeDisplayStyle, normalizeNoteAuthor } from "@/lib/noteValidation";

describe("note validation", () => {
  it("requires at least content or one media URL", () => {
    expect(hasNoteContent({})).toBe(false);
    expect(hasNoteContent({ content: "hello" })).toBe(true);
    expect(hasNoteContent({ imagePath: "a/b/c.jpg" })).toBe(true);
    expect(hasNoteContent({ audioPath: "a/b/c.m4a" })).toBe(true);
    expect(hasNoteContent({ videoPath: "a/b/c.mp4" })).toBe(true);
  });

  it("detects media paths (not just URLs)", () => {
    expect(hasNoteContent({ imagePath: "a/b/c.jpg" })).toBe(true);
    expect(hasNoteContent({ audioPath: "a/b/c.m4a" })).toBe(true);
    expect(hasNoteContent({ videoPath: "a/b/c.mp4" })).toBe(true);
    expect(hasNoteContent({})).toBe(false);
  });

  it("infers note types", () => {
    expect(inferNoteType({ content: "hello" })).toBe("text");
    expect(inferNoteType({ imagePath: "a.jpg" })).toBe("image");
    expect(inferNoteType({ audioPath: "a.m4a" })).toBe("audio");
    expect(inferNoteType({ videoPath: "a.mp4" })).toBe("video");
    expect(inferNoteType({ content: "hello", imagePath: "a.jpg" })).toBe("mixed");
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


describe("download button visibility matrix", () => {
  // Test that download helpers work for ALL note types
  it.each([
    ["纯文本", { content: "hello" }, false],
    ["纯图片", { imagePath: "a/b/c.jpg" }, true],
    ["纯视频", { videoPath: "a/b/c.mp4" }, true],
    ["纯音频", { audioPath: "a/b/c.m4a" }, true],
    ["文本+图片 (mixed)", { content: "hello", imagePath: "a/b/c.jpg" }, true],
    ["文本+视频 (mixed)", { content: "hello", videoPath: "a/b/c.mp4" }, true],
    ["文本+音频 (mixed)", { content: "hello", audioPath: "a/b/c.m4a" }, true],
    ["图片+视频", { imagePath: "a.jpg", videoPath: "b.mp4" }, true],
    ["图片+音频", { imagePath: "a.jpg", audioPath: "b.m4a" }, true],
    ["图片+视频+音频", { imagePath: "a.jpg", videoPath: "b.mp4", audioPath: "c.m4a" }, true],
    ["旧数据(URL only, no path)", { imageUrl: "https://old.com/a.jpg" }, false],
    ["空对象", {}, false],
  ])("%s → hasDownloadableMedia=%s", async (_label, note, expected) => {
    const { hasNoteDownloadableMedia } = await import("@/lib/notesMedia");
    expect(hasNoteDownloadableMedia(note as unknown as import("@/lib/types").LoveNote)).toBe(expected);
  });
});
