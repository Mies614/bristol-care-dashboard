/**
 * Storage Egress unit tests.
 *
 * Verifies:
 * 1. Upload functions set cacheControl for immutable assets
 * 2. Media URLs are public (not signed) — no per-request URL generation
 * 3. Video tags in components have preload="none"/"metadata" (not auto)
 * 4. E2E intercept infrastructure exists
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

// --- cacheControl on uploads ---

describe("Storage upload cacheControl", () => {
  it("albumUpload sets cacheControl on storage.upload", () => {
    const src = readFileSync(resolve(__dirname, "../lib/albumUpload.ts"), "utf-8");
    expect(src).toContain("cacheControl");
    expect(src).toContain("31536000");
  });

  it("noteUpload sets cacheControl on storage.upload", () => {
    const src = readFileSync(resolve(__dirname, "../lib/noteUpload.ts"), "utf-8");
    expect(src).toContain("cacheControl");
    expect(src).toContain("31536000");
  });

  it("backgroundUpload sets cacheControl on storage.upload", () => {
    const src = readFileSync(resolve(__dirname, "../lib/backgroundUpload.ts"), "utf-8");
    expect(src).toContain("cacheControl");
    expect(src).toContain("31536000");
  });
});

// --- No signed URL regeneration ---

describe("No signed URL regeneration", () => {
  it("albumUpload uses getPublicUrl (static), not createSignedUrl", () => {
    const src = readFileSync(resolve(__dirname, "../lib/albumUpload.ts"), "utf-8");
    expect(src).toContain("getPublicUrl");
    expect(src).not.toContain("createSignedUrl");
  });

  it("noteUpload uses getPublicUrl (static), not createSignedUrl", () => {
    const src = readFileSync(resolve(__dirname, "../lib/noteUpload.ts"), "utf-8");
    expect(src).toContain("getPublicUrl");
    expect(src).not.toContain("createSignedUrl");
  });

  it("backgroundUpload uses getPublicUrl (static), not createSignedUrl", () => {
    const src = readFileSync(resolve(__dirname, "../lib/backgroundUpload.ts"), "utf-8");
    expect(src).toContain("getPublicUrl");
    expect(src).not.toContain("createSignedUrl");
  });
});

// --- Video preload ---

describe("Video preload attributes", () => {
  it("LoveNoteCard video has preload=none", () => {
    const src = readFileSync(resolve(__dirname, "../components/LoveNoteCard.tsx"), "utf-8");
    expect(src).toContain('preload="none"');
  });

  it("NoteCard video source contains preload=metadata", () => {
    const src = readFileSync(resolve(__dirname, "../components/NoteCard.tsx"), "utf-8");
    // Source-level check (regex fails on => in onClick handler)
    expect(src).toContain('preload="metadata"');
  });

  it("AlbumsPageContent lightbox video source contains preload=metadata", () => {
    const src = readFileSync(resolve(__dirname, "../components/AlbumsPageContent.tsx"), "utf-8");
    expect(src).toContain('preload="metadata"');
  });
});

// --- Image lazy loading ---

describe("Image lazy loading", () => {
  it("ImageWithSkeleton uses loading=lazy and decoding=async", () => {
    const src = readFileSync(resolve(__dirname, "../components/ImageWithSkeleton.tsx"), "utf-8");
    expect(src).toContain('loading="lazy"');
    expect(src).toContain('decoding="async"');
  });

  it("homepage recent memories images use loading=lazy", () => {
    const partnerSrc = readFileSync(resolve(__dirname, "../app/page.tsx"), "utf-8");
    const ownerSrc = readFileSync(resolve(__dirname, "../app/me/page.tsx"), "utf-8");
    const combined = partnerSrc + ownerSrc;
    expect(combined).toContain('loading="lazy"');
  });
});

// --- E2E Storage intercept ---

describe("E2E Storage intercept", () => {
  it("fixtures.ts exists and wraps test with interceptSupabaseStorage", () => {
    const src = readFileSync(resolve(__dirname, "../tests/e2e/fixtures.ts"), "utf-8");
    expect(src).toContain("interceptSupabaseStorage");
    expect(src).toContain("base.extend");
  });

  it("storage-intercept.ts exists and contains supabase Storage pattern", () => {
    const src = readFileSync(resolve(__dirname, "../tests/e2e/utils/storage-intercept.ts"), "utf-8");
    expect(src).toContain("SUPABASE_STORAGE_PATTERN");
    // The pattern uses a regex with supabase.co in it
    expect(src).toMatch(/supabase.*storage.*public/i);
    expect(src).toContain("fulfill");
  });

  it("storage-egress.spec.ts exists as dedicated egress test", () => {
    const src = readFileSync(resolve(__dirname, "../tests/e2e/storage-egress.spec.ts"), "utf-8");
    expect(src).toContain("Storage Egress Guard");
    expect(src).toContain("_storageRequests");
  });

  it("all E2E spec files import from fixtures (not @playwright/test directly)", () => {
    const e2eDir = resolve(__dirname, "../tests/e2e");
    const files = readdirSync(e2eDir).filter((f: string) => f.endsWith(".spec.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(resolve(e2eDir, file), "utf-8");
      if (file === "storage-egress.spec.ts") continue;
      expect(src).toContain('import { test, expect } from "./fixtures"');
      expect(src).not.toMatch(/import \{ test, expect \} from ["']@playwright\/test["']/);
    }
  });
});
