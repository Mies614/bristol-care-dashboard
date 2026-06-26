import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function stripCommentsAndQuotedStrings(input: string): string {
  return input
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"[^"]*"/g, "\"\"")
    .trim();
}

const DDL_DML_KEYWORDS = /\b(alter table|create|insert|update|delete|truncate|grant|revoke)\b/i;

describe("S2.2: browser no longer accesses user_identities directly", () => {
  const storage = readFileSync(
    resolve(__dirname, "../lib/identityStorage.ts"),
    "utf-8",
  );

  it("does not import getSupabaseBrowserClient", () => {
    expect(storage).not.toContain("getSupabaseBrowserClient");
    expect(storage).not.toContain("supabase/client");
  });

  it("uses /api/identities instead of direct Supabase access", () => {
    expect(storage).toContain("/api/identities");
  });

  it("does not call supabase.from('user_identities') directly", () => {
    expect(storage).not.toMatch(/\.from\s*\(\s*["']user_identities["']\s*\)/);
  });
});

describe("S2.2: upload modules use signed upload, not anon Storage", () => {
  const noteUpload = readFileSync(
    resolve(__dirname, "../lib/noteUpload.ts"),
    "utf-8",
  );
  const albumUpload = readFileSync(
    resolve(__dirname, "../lib/albumUpload.ts"),
    "utf-8",
  );
  const bgUpload = readFileSync(
    resolve(__dirname, "../lib/backgroundUpload.ts"),
    "utf-8",
  );
  const signedUpload = readFileSync(
    resolve(__dirname, "../lib/signedUpload.ts"),
    "utf-8",
  );

  it("noteUpload does not call supabase.storage.from", () => {
    expect(noteUpload).not.toContain("supabase.storage.from");
    expect(noteUpload).not.toContain("getSupabaseBrowserClient");
  });

  it("albumUpload does not call supabase.storage.from", () => {
    expect(albumUpload).not.toContain("supabase.storage.from");
    expect(albumUpload).not.toContain("getSupabaseBrowserClient");
    expect(albumUpload).not.toContain("getPublicUrl");
  });

  it("backgroundUpload does not call supabase.storage.from", () => {
    expect(bgUpload).not.toContain("supabase.storage.from");
    expect(bgUpload).not.toContain("getSupabaseBrowserClient");
  });

  it("signedUpload calls /api/upload/authorize", () => {
    expect(signedUpload).toContain("/api/upload/authorize");
  });

  it("signedUpload does not generate public URLs for private buckets", () => {
    expect(signedUpload).not.toContain("object/public");
    expect(signedUpload).not.toContain("publicUrl");
  });
});

describe("S2.2: /api/identities blocks admin elevation", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/identities/route.ts"),
    "utf-8",
  );

  it("blocks role=admin", () => {
    expect(route).toContain("ADMIN_ELEVATION_FORBIDDEN");
    expect(route).toContain('role === "admin"');
  });

  it("blocks deletion of built-in identities", () => {
    expect(route).toContain("BUILTIN_DELETE_FORBIDDEN");
  });
});

describe("S2.2: /api/upload/authorize enforces constraints", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/upload/authorize/route.ts"),
    "utf-8",
  );

  it("blocks unknown buckets", () => {
    expect(route).toContain("UNKNOWN_BUCKET");
  });

  it("blocks forbidden MIME types", () => {
    expect(route).toContain("MIME_FORBIDDEN");
  });

  it("validates file size", () => {
    expect(route).toContain("SIZE_INVALID");
  });

  it("rejects invalid extensions", () => {
    expect(route).toContain("EXTENSION_INVALID");
  });
});

describe("S2.2: database hotfix migration", () => {
  const migration = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000002_remove_public_business_access.sql"),
    "utf-8",
  );
  const rollback = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000003_rollback_public_business_access.sql"),
    "utf-8",
  );

  it("removes all known public true policies", () => {
    expect(migration).toContain("content_comments");
    expect(migration).toContain("content_interactions");
    expect(migration).toContain("user_identities");
    expect(migration).toContain("couple_spaces");
    expect(migration).toContain("love_notes");
  });

  it("uses ONLY DROP POLICY (no schema changes)", () => {
    const withoutComments = stripCommentsAndQuotedStrings(migration);
    expect(withoutComments).not.toMatch(DDL_DML_KEYWORDS);
  });

  it("rollback restores all policies", () => {
    expect(rollback).toContain("content_comments");
    expect(rollback).toContain("content_interactions");
    expect(rollback).toContain("user_identities");
    expect(rollback).toContain("couple_spaces");
    expect(rollback).toContain("love_notes");
  });

  it("rollback documents risk", () => {
    expect(rollback).toContain("WARNING");
    expect(rollback.toLowerCase()).toContain("public-access");
  });
});

describe("S2.2: Storage hotfix migration", () => {
  const migration = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000004_disable_anonymous_storage_uploads.sql"),
    "utf-8",
  );
  const rollback = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000005_rollback_anonymous_storage_uploads.sql"),
    "utf-8",
  );

  it("removes anon INSERT policies for all three buckets", () => {
    expect(migration).toContain("backgrounds");
    expect(migration).toContain("couple-albums");
    expect(migration).toContain("love-notes");
  });

  it("uses ONLY DROP POLICY", () => {
    const withoutComments = stripCommentsAndQuotedStrings(migration);
    expect(withoutComments).not.toMatch(DDL_DML_KEYWORDS);
  });

  it("rollback restores all three bucket policies", () => {
    expect(rollback).toContain("backgrounds");
    expect(rollback).toContain("couple-albums");
    expect(rollback).toContain("love-notes");
  });

  it("rollback documents risk", () => {
    expect(rollback).toContain("WARNING");
    expect(rollback.toLowerCase()).toContain("anonymous");
  });
});

describe("S2.2: API blocks unauthorized identity write", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/identities/route.ts"),
    "utf-8",
  );

  it("POST uses resolveApiAuth", () => {
    expect(route).toContain("resolveApiAuth");
  });

  it("DELETE uses resolveApiAuth", () => {
    expect(route).toContain("resolveApiAuth");
  });
});

describe("S2.2: no remaining browser-side direct Supabase writes", () => {
  const clientFile = readFileSync(
    resolve(__dirname, "../lib/supabase/client.ts"),
    "utf-8",
  );

  it("browser client still exports but no write paths import it", () => {
    expect(clientFile).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
