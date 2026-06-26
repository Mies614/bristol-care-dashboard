import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function stripComments(input: string): string {
  return input.replace(/--.*$/gm, "").trim();
}

const DDL_DML_KEYWORDS = /\b(alter table|create table|insert into|update set|delete from|truncate|grant|revoke|drop table)\b/i;

describe("S2.3: make-private migration", () => {
  const migration = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000006_make_private_media_buckets.sql"),
    "utf-8",
  );
  const rollback = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000007_rollback_private_media_buckets.sql"),
    "utf-8",
  );

  it("only modifies bucket public flags", () => {
    const stripped = stripComments(migration);
    expect(stripped).toContain("public = false");
    expect(stripped).toContain("couple-albums");
    expect(stripped).toContain("love-notes");
  });

  it("does NOT modify backgrounds", () => {
    const stripped = stripComments(migration);
    // backgrounds should NOT be set to private
    expect(stripped).not.toMatch(/backgrounds.*public\s*=\s*false/);
  });

  it("uses no DDL/DML beyond bucket updates", () => {
    const stripped = stripComments(migration);
    expect(stripped).not.toMatch(DDL_DML_KEYWORDS);
  });

  it("does not delete or rename objects", () => {
    expect(migration).not.toMatch(/delete\s+(from|object)/i);
    expect(migration).not.toMatch(/rename/i);
  });

  it("does not re-enable anonymous INSERT", () => {
    expect(migration).not.toMatch(/create\s+policy/i);
    // INSERT appears in documentation text, not as DML
    const stripped = stripComments(migration);
    expect(stripped).not.toMatch(/insert\s+(into|policy)/i);
  });

  it("includes preflight bucket existence check", () => {
    expect(migration).toContain("couple-albums not found");
    expect(migration).toContain("love-notes not found");
  });

  it("includes post-check query", () => {
    expect(migration).toContain("SELECT id, name, public");
  });

  it("is idempotent (checks current state before update)", () => {
    expect(migration).toContain("already private");
  });

  it("rollback makes buckets public again", () => {
    expect(rollback).toContain("public = true");
    expect(rollback).toContain("couple-albums");
    expect(rollback).toContain("love-notes");
  });

  it("rollback does NOT restore anonymous INSERT policies", () => {
    expect(rollback).not.toMatch(/create\s+policy/i);
    // INSERT appears in documentation text, not as DML
    const stripped = stripComments(rollback);
    expect(stripped).not.toMatch(/insert\s+(into|policy)/i);
  });

  it("rollback documents risk", () => {
    expect(rollback).toContain("WARNING");
    expect(rollback.toLowerCase()).toContain("publicly readable");
  });
});

describe("S2.3: /api/media/sign blocks unauthorized access", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/media/sign/route.ts"),
    "utf-8",
  );

  it("blocks backgrounds from signing", () => {
    // The route should explicitly exclude backgrounds from signable buckets
    const signSet = route.match(/SIGN_READABLE_BUCKETS\s*=\s*new Set\(\[(.*?)\]\)/s);
    expect(signSet).toBeTruthy();
    if (signSet) {
      const buckets = signSet[1];
      expect(buckets).not.toContain("backgrounds");
    }
  });

  it("POST validates contentType", () => {
    expect(route).toContain("Unsupported contentType");
  });

  it("batch GET limits size", () => {
    expect(route).toContain("MAX_BATCH_SIZE");
  });

  it("requires origin check on POST", () => {
    expect(route).toContain("requireOrigin");
  });

  it("does not leak object existence", () => {
    expect(route).toContain("No media found");
  });
});

describe("S2.3: signed media components", () => {
  const img = readFileSync(
    resolve(__dirname, "../components/SignedMediaImage.tsx"),
    "utf-8",
  );
  const video = readFileSync(
    resolve(__dirname, "../components/SignedMediaVideo.tsx"),
    "utf-8",
  );
  const audio = readFileSync(
    resolve(__dirname, "../components/SignedMediaAudio.tsx"),
    "utf-8",
  );

  it("image supports retry on error", () => {
    expect(img).toContain("canRetry");
    expect(img).toContain("invalidateSignedUrl");
  });

  it("video defaults to preload=none", () => {
    expect(video).toContain('preload="none"');
  });

  it("video loads URL on user click (not on mount)", () => {
    expect(video).toContain("onClick={loadUrl}");
  });

  it("audio defaults to preload=none", () => {
    expect(audio).toContain('preload="none"');
  });

  it("audio loads URL on click", () => {
    expect(audio).toContain("onClick={loadUrl}");
  });

  it("signed cache does not store to localStorage", () => {
    const cache = readFileSync(
      resolve(__dirname, "../lib/signedMediaCache.ts"),
      "utf-8",
    );
    // The file documents this constraint in comments.
    // Check the actual code (strip comments) doesn't use storage APIs.
    const stripped = cache
      .replace(/\/\*\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/--.*$/gm, "");
    expect(stripped).not.toContain("localStorage");
    expect(stripped).not.toContain("sessionStorage");
    expect(stripped).not.toContain("indexedDB");
  });

  it("signed cache auto-purges expired entries", () => {
    const cache = readFileSync(
      resolve(__dirname, "../lib/signedMediaCache.ts"),
      "utf-8",
    );
    expect(cache).toContain("cache.delete");
    expect(cache).toContain("expiresAt");
  });
});


describe("S3: media sign API uses auth-based context", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/media/sign/route.ts"),
    "utf-8",
  );

  it("imports requireAuth from authenticatedRequestContext", () => {
    expect(route).toContain("requireAuth");
    expect(route).toContain("authenticatedRequestContext");
  });

  it("falls back to resolveRequestContext in off mode", () => {
    expect(route).toContain('"off"');
    expect(route).toContain("resolveRequestContext");
  });

  it("validates batch paths belong to authenticated space", () => {
    expect(route).toContain("startsWith(spaceCode");
  });
});

describe("S3: signed media components do not use public URL fallback", () => {
  const img = readFileSync(
    resolve(__dirname, "../components/SignedMediaImage.tsx"),
    "utf-8",
  );
  const video = readFileSync(
    resolve(__dirname, "../components/SignedMediaVideo.tsx"),
    "utf-8",
  );
  const audio = readFileSync(
    resolve(__dirname, "../components/SignedMediaAudio.tsx"),
    "utf-8",
  );

  it("SignedMediaImage does not construct public storage URL", () => {
    expect(img).not.toContain("object/public");
  });

  it("SignedMediaVideo does not construct public storage URL", () => {
    expect(video).not.toContain("object/public");
  });

  it("SignedMediaAudio does not construct public storage URL", () => {
    expect(audio).not.toContain("object/public");
  });
});
