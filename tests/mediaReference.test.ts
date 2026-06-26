import { describe, it, expect, beforeAll } from "vitest";
import { parsePublicStorageUrl, isValidStoragePath, isValidBucket, inferKindFromPath } from "@/lib/mediaReference";

describe("parsePublicStorageUrl", () => {
  beforeAll(() => {
    // Ensure SUPABASE_URL is set for host matching
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    }
  });
  it("parses a valid couple-albums public URL", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const url = `${base}/storage/v1/object/public/couple-albums/xiaoguai520/me/2026/01/images/uuid.jpg`;
    const ref = parsePublicStorageUrl(url);
    expect(ref).toBeTruthy();
    expect(ref!.bucket).toBe("couple-albums");
    expect(ref!.path).toBe("xiaoguai520/me/2026/01/images/uuid.jpg");
  });

  it("parses a valid love-notes public URL", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const url = `${base}/storage/v1/object/public/love-notes/xiaoguai520/xiaoguai/2026/01/images/uuid.jpg`;
    const ref = parsePublicStorageUrl(url);
    expect(ref).toBeTruthy();
    expect(ref!.bucket).toBe("love-notes");
  });

  it("rejects wrong hostname", () => {
    const ref = parsePublicStorageUrl("https://evil.example.com/storage/v1/object/public/couple-albums/a/b.jpg");
    expect(ref).toBeNull();
  });

  it("rejects wrong path prefix", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const ref = parsePublicStorageUrl(`${base}/other/object/public/couple-albums/a/b.jpg`);
    expect(ref).toBeNull();
  });

  it("rejects empty URL", () => {
    expect(parsePublicStorageUrl("")).toBeNull();
  });

  it("rejects malformed URL", () => {
    expect(parsePublicStorageUrl("not-a-url")).toBeNull();
  });

  it("rejects unknown bucket", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const ref = parsePublicStorageUrl(`${base}/storage/v1/object/public/unknown-bucket/a/b.jpg`);
    expect(ref).toBeNull();
  });

  it("rejects URL with path traversal", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const ref = parsePublicStorageUrl(`${base}/storage/v1/object/public/couple-albums/../evil/b.jpg`);
    expect(ref).toBeNull();
  });

  it("accepts backgrounds bucket", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
    const ref = parsePublicStorageUrl(`${base}/storage/v1/object/public/backgrounds/xiaoguai520/me/2026/01/backgrounds/uuid.jpg`);
    expect(ref).toBeTruthy();
    expect(ref!.bucket).toBe("backgrounds");
  });
});

describe("isValidStoragePath", () => {
  it("accepts normal path", () => {
    expect(isValidStoragePath("xiaoguai520/me/2026/01/images/uuid.jpg")).toBe(true);
  });

  it("rejects path traversal ..", () => {
    expect(isValidStoragePath("folder/../evil.jpg")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidStoragePath("")).toBe(false);
  });

  it("rejects path starting with /", () => {
    expect(isValidStoragePath("/absolute/path.jpg")).toBe(false);
  });

  it("rejects path with query string", () => {
    expect(isValidStoragePath("folder/file.jpg?token=abc")).toBe(false);
  });

  it("rejects double encoding traversal", () => {
    expect(isValidStoragePath("folder/%2e%2e/evil.jpg")).toBe(false);
  });

  it("rejects path longer than 1024 chars", () => {
    expect(isValidStoragePath("a".repeat(1025))).toBe(false);
  });
});

describe("isValidBucket", () => {
  it("accepts love-notes", () => expect(isValidBucket("love-notes")).toBe(true));
  it("accepts couple-albums", () => expect(isValidBucket("couple-albums")).toBe(true));
  it("accepts backgrounds", () => expect(isValidBucket("backgrounds")).toBe(true));
  it("rejects unknown bucket", () => expect(isValidBucket("evil")).toBe(false));
});

describe("inferKindFromPath", () => {
  it("detects video", () => {
    expect(inferKindFromPath("a/b/videos/uuid.mp4")).toBe("video");
  });

  it("detects audio", () => {
    expect(inferKindFromPath("a/b/audio/uuid.mp3")).toBe("audio");
  });

  it("defaults to image", () => {
    expect(inferKindFromPath("a/b/images/uuid.jpg")).toBe("image");
  });
});
