import { describe, expect, it } from "vitest";
import { getImageExtension, MAX_IMAGE_SIZE, validateImageFile } from "@/lib/imageValidation";

describe("image validation", () => {
  it("allows jpg/png/webp", () => {
    expect(validateImageFile(new Blob(["x"], { type: "image/jpeg" })).ok).toBe(true);
    expect(validateImageFile(new Blob(["x"], { type: "image/png" })).ok).toBe(true);
    expect(validateImageFile(new Blob(["x"], { type: "image/webp" })).ok).toBe(true);
  });

  it("rejects non-image types", () => {
    expect(validateImageFile(new Blob(["x"], { type: "text/plain" })).ok).toBe(false);
  });

  it("rejects files over 5MB", () => {
    const file = new Blob([new Uint8Array(MAX_IMAGE_SIZE + 1)], { type: "image/png" });
    expect(validateImageFile(file).ok).toBe(false);
  });

  it("maps MIME type to extension", () => {
    expect(getImageExtension("image/jpeg")).toBe("jpg");
    expect(getImageExtension("image/png")).toBe("png");
    expect(getImageExtension("image/webp")).toBe("webp");
  });
});
