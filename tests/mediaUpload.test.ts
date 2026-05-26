import { describe, expect, it } from "vitest";
import { createUploadStageMessage, formatFileSize, isLargeMediaFile, uploadWithTimeout } from "@/lib/mediaUpload";

describe("media upload helpers", () => {
  it("resolves before timeout", async () => {
    await expect(uploadWithTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects on timeout", async () => {
    await expect(uploadWithTimeout(new Promise((resolve) => setTimeout(resolve, 50)), 1)).rejects.toThrow("上传超时");
  });

  it("formats file sizes and large warnings", () => {
    expect(formatFileSize(1024)).toBe("1KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0MB");
    expect(isLargeMediaFile(new Blob([new Uint8Array(21 * 1024 * 1024)]), "image")).toBe(true);
    expect(isLargeMediaFile(new Blob([new Uint8Array(51 * 1024 * 1024)]), "video")).toBe(true);
  });

  it("creates stage messages", () => {
    expect(createUploadStageMessage("save")).toBe("保存记录");
  });
});
