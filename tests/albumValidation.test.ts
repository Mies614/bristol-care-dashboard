import { describe, expect, it } from "vitest";
import {
  determineAlbumItemType,
  getAlbumFileExtension,
  MAX_ALBUM_IMAGE_SIZE,
  MAX_ALBUM_VIDEO_SIZE,
  validateAlbumImageFile,
  validateAlbumVideoFile
} from "@/lib/albumValidation";

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

  it("rejects invalid file types", () => {
    expect(validateAlbumImageFile(new Blob(["x"], { type: "text/plain" })).ok).toBe(false);
    expect(validateAlbumVideoFile(new Blob(["x"], { type: "application/pdf" })).ok).toBe(false);
  });

  it("rejects files over size limits", () => {
    expect(validateAlbumImageFile(new Blob([new Uint8Array(MAX_ALBUM_IMAGE_SIZE + 1)], { type: "image/png" })).ok).toBe(false);
    expect(validateAlbumVideoFile(new Blob([new Uint8Array(MAX_ALBUM_VIDEO_SIZE + 1)], { type: "video/mp4" })).ok).toBe(false);
  });

  it("maps MIME types to extensions", () => {
    expect(getAlbumFileExtension("image/jpeg")).toBe("jpg");
    expect(getAlbumFileExtension("image/heic")).toBe("heic");
    expect(getAlbumFileExtension("video/quicktime")).toBe("mov");
  });

  it("determines item type", () => {
    expect(determineAlbumItemType(true, true)).toBe("live_photo");
    expect(determineAlbumItemType(true, false)).toBe("photo");
    expect(determineAlbumItemType(false, true)).toBe("video");
  });
});
