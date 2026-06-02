import { describe, expect, it } from "vitest";
import { classifyUploadError } from "@/lib/uploadError";

describe("classifyUploadError", () => {
  it("detects supabase missing error", () => {
    const result = classifyUploadError(
      new Error("Supabase publishable client 未配置，无法上传小纸条媒体。"),
      { fileKind: "image" }
    );
    expect(result.kind).toBe("supabase_missing");
    expect(result.canRetry).toBe(true);
    expect(result.friendlyMessage).toContain("云存储未配置");
  });

  it("detects network error from Failed to fetch", () => {
    const result = classifyUploadError(
      new Error("Failed to fetch"),
      { fileKind: "video" }
    );
    expect(result.kind).toBe("network");
    expect(result.canRetry).toBe(true);
    expect(result.friendlyMessage).toContain("网络连接失败");
  });

  it("detects network error from TypeError", () => {
    const result = classifyUploadError(
      new TypeError("NetworkError when attempting to fetch resource."),
      { fileKind: "audio" }
    );
    expect(result.kind).toBe("network");
    expect(result.canRetry).toBe(true);
  });

  it("detects timeout", () => {
    const result = classifyUploadError(
      new Error("上传超时"),
      { fileKind: "video" }
    );
    expect(result.kind).toBe("timeout");
    expect(result.canRetry).toBe(true);
    expect(result.friendlyMessage).toContain("超时");
  });

  it("detects file too large from message", () => {
    const result = classifyUploadError(
      new Error("视频大小不能超过 50MB。"),
      { fileKind: "video" }
    );
    expect(result.kind).toBe("file_too_large");
    expect(result.canRetry).toBe(false);
  });

  it("detects file too large from size context", () => {
    const result = classifyUploadError(
      new Error("unknown upload error"),
      { fileKind: "image", fileSize: 25 * 1024 * 1024 }
    );
    expect(result.kind).toBe("file_too_large");
    expect(result.canRetry).toBe(false);
  });

  it("detects file type unsupported", () => {
    const result = classifyUploadError(
      new Error("不支持该文件格式"),
      { fileKind: "image", fileType: "image/bmp" }
    );
    expect(result.kind).toBe("file_type_unsupported");
    expect(result.canRetry).toBe(false);
  });

  it("detects server error", () => {
    const result = classifyUploadError(
      new Error("internal server error 500"),
      { fileKind: "image" }
    );
    expect(result.kind).toBe("server_error");
    expect(result.canRetry).toBe(true);
  });

  it("handles unknown errors as retryable", () => {
    const result = classifyUploadError(
      new Error("something completely unexpected"),
      { fileKind: "image" }
    );
    expect(result.kind).toBe("unknown");
    expect(result.canRetry).toBe(true);
    expect(result.friendlyMessage).toContain("上传失败");
  });

  it("handles string errors", () => {
    const result = classifyUploadError("Failed to fetch", { fileKind: "video" });
    expect(result.kind).toBe("network");
  });

  it("handles null/undefined errors gracefully", () => {
    const result = classifyUploadError(null, { fileKind: "image" });
    expect(result.kind).toBe("unknown");
    expect(result.canRetry).toBe(true);
  });

  it("validates file size limits per kind", () => {
    // Image max is 20MB
    const imgResult = classifyUploadError(
      new Error("too big"),
      { fileKind: "image", fileSize: 20.1 * 1024 * 1024 }
    );
    expect(imgResult.kind).toBe("file_too_large");

    // Video max is 50MB
    const videoResult = classifyUploadError(
      new Error("too big"),
      { fileKind: "video", fileSize: 51 * 1024 * 1024 }
    );
    expect(videoResult.kind).toBe("file_too_large");

    // Audio max is 50MB
    const audioResult = classifyUploadError(
      new Error("too big"),
      { fileKind: "audio", fileSize: 50.1 * 1024 * 1024 }
    );
    expect(audioResult.kind).toBe("file_too_large");
  });

  it("validates file type against known allowed types", () => {
    const result = classifyUploadError(
      new Error("upload failed"),
      { fileKind: "image", fileType: "application/pdf" }
    );
    expect(result.kind).toBe("file_type_unsupported");
  });
});
