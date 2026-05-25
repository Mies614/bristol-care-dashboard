import { describe, expect, it } from "vitest";
import {
  determineAlbumItemType,
  getAlbumFileExtension,
  MAX_ALBUM_IMAGE_SIZE,
  MAX_ALBUM_VIDEO_SIZE,
  validateAlbumImageFile,
  validateAlbumVideoFile
} from "@/lib/albumValidation";
import { buildAlbumMetadataPayload } from "@/lib/albumUpload";

function namedBlob(type: string, name: string, size = 1) {
  const blob = new Blob([new Uint8Array(size)], { type }) as Blob & { name: string };
  Object.defineProperty(blob, "name", { value: name });
  return blob;
}

describe("album validation", () => {
  it("allows supported image types", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
      expect(validateAlbumImageFile(new Blob(["x"], { type })).ok).toBe(true);
    }
  });

  it("allows supported video types", () => {
    for (const type of ["video/mp4", "video/quicktime", "video/webm"]) {
      expect(validateAlbumVideoFile(new Blob(["x"], { type })).ok).toBe(true);
    }
  });

  it("allows mobile video octet-stream files by extension", () => {
    expect(validateAlbumVideoFile(namedBlob("application/octet-stream", "IMG_0001.mov")).ok).toBe(true);
    expect(validateAlbumVideoFile(namedBlob("application/octet-stream", "clip.mp4")).ok).toBe(true);
    expect(validateAlbumVideoFile(namedBlob("application/octet-stream", "memory.webm")).ok).toBe(true);
  });

  it("rejects invalid file types", () => {
    expect(validateAlbumImageFile(new Blob(["x"], { type: "text/plain" })).ok).toBe(false);
    expect(validateAlbumVideoFile(new Blob(["x"], { type: "application/pdf" })).ok).toBe(false);
    expect(validateAlbumVideoFile(namedBlob("application/octet-stream", "archive.zip")).ok).toBe(false);
  });

  it("rejects files over size limits", () => {
    expect(validateAlbumImageFile(new Blob([new Uint8Array(MAX_ALBUM_IMAGE_SIZE + 1)], { type: "image/png" })).ok).toBe(false);
    expect(validateAlbumVideoFile(new Blob([new Uint8Array(MAX_ALBUM_VIDEO_SIZE + 1)], { type: "video/mp4" })).ok).toBe(false);
  });

  it("maps MIME types to extensions", () => {
    expect(getAlbumFileExtension("image/jpeg")).toBe("jpg");
    expect(getAlbumFileExtension("image/heic")).toBe("heic");
    expect(getAlbumFileExtension("video/quicktime")).toBe("mov");
    expect(getAlbumFileExtension(namedBlob("application/octet-stream", "IMG_0001.mov"))).toBe("mov");
    expect(getAlbumFileExtension(namedBlob("application/octet-stream", "clip.mp4"))).toBe("mp4");
  });

  it("determines item type", () => {
    expect(determineAlbumItemType(true, true)).toBe("live_photo");
    expect(determineAlbumItemType(true, false)).toBe("photo");
    expect(determineAlbumItemType(false, true)).toBe("video");
  });

  it("builds metadata payload without File objects", () => {
    const payload = buildAlbumMetadataPayload({
      password: "pw",
      code: "BRISTOL2026",
      draft: { title: "海边", note: "风很轻", takenAt: "2026-05-25", location: "Bristol", isFavorite: true },
      imageUpload: { url: "https://example.com/image.jpg", path: "BRISTOL2026/images/a.jpg", size: 10, mimeType: "image/jpeg" },
      videoUpload: { url: "https://example.com/video.mov", path: "BRISTOL2026/videos/a.mov", size: 20, mimeType: "video/quicktime" }
    });
    expect(payload.type).toBe("live_photo");
    expect(payload.file_size).toBe(30);
    expect(JSON.stringify(payload)).not.toContain("File");
    expect(payload).not.toHaveProperty("image");
    expect(payload).not.toHaveProperty("video");
  });
});
