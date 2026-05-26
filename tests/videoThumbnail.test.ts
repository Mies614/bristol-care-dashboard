import { describe, expect, it } from "vitest";
import { generateVideoThumbnail, shouldGenerateVideoThumbnail } from "../lib/videoThumbnail";

describe("video thumbnail helpers", () => {
  it("generates thumbnail only when video exists without image", () => {
    const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const image = new File(["image"], "cover.jpg", { type: "image/jpeg" });
    expect(shouldGenerateVideoThumbnail(null, video)).toBe(true);
    expect(shouldGenerateVideoThumbnail(image, video)).toBe(false);
    expect(shouldGenerateVideoThumbnail(null, null)).toBe(false);
  });

  it("can fail safely when video/canvas APIs are unavailable", async () => {
    const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
    await expect(generateVideoThumbnail(video)).rejects.toThrow();
  });
});
