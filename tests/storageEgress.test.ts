import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

// --- Signed upload replaces anon Storage ---

describe("Signed upload replaces anon Storage", () => {
  it("noteUpload uses signedUpload, not supabase.storage.from directly", () => {
    const src = readFileSync(resolve(__dirname, "../lib/noteUpload.ts"), "utf-8");
    expect(src).toContain("signedUpload");
    expect(src).not.toContain("supabase.storage.from");
  });

  it("albumUpload uses signedUpload, not supabase.storage.from directly", () => {
    const src = readFileSync(resolve(__dirname, "../lib/albumUpload.ts"), "utf-8");
    expect(src).toContain("signedUpload");
    expect(src).not.toContain("supabase.storage.from");
  });

  it("backgroundUpload uses signedUpload, not supabase.storage.from directly", () => {
    const src = readFileSync(resolve(__dirname, "../lib/backgroundUpload.ts"), "utf-8");
    expect(src).toContain("signedUpload");
    expect(src).not.toContain("supabase.storage.from");
  });

  it("signedUpload client uses /api/upload/authorize for server validation", () => {
    const src = readFileSync(resolve(__dirname, "../lib/signedUpload.ts"), "utf-8");
    expect(src).toContain("/api/upload/authorize");
    expect(src).toContain("signedUrl");
  });

  it("signedUpload constructs public URL from bucket and path", () => {
    const src = readFileSync(resolve(__dirname, "../lib/signedUpload.ts"), "utf-8");
    expect(src).toContain("storage/v1/object/public");
  });

  it("cacheControl is set in signedUpload via fetch headers", () => {
    const src = readFileSync(resolve(__dirname, "../lib/signedUpload.ts"), "utf-8");
    expect(src).toContain("Cache-Control");
    expect(src).toContain("31536000");
  });
});

// --- Video preload ---

describe("Video preload attributes", () => {
  it("LoveNoteCard video uses SignedMediaVideo", () => {
    const src = readFileSync(resolve(__dirname, "../components/LoveNoteCard.tsx"), "utf-8");
    expect(src).toContain("SignedMediaVideo");
    expect(src).not.toContain("<video");
  });

  it("NoteCard video uses SignedMediaVideo", () => {
    const src = readFileSync(resolve(__dirname, "../components/NoteCard.tsx"), "utf-8");
    expect(src).toContain("SignedMediaVideo");
    expect(src).not.toContain("<video");
  });

  it("AlbumsPageContent lightbox video uses SignedMediaVideo", () => {
    const src = readFileSync(resolve(__dirname, "../components/AlbumsPageContent.tsx"), "utf-8");
    expect(src).toContain("SignedMediaVideo");
    // The old video tag should be replaced
    expect(src).not.toContain("<video className");
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
