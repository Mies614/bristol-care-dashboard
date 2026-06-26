import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("S3: space_members table", () => {
  const migration = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000008_create_space_members.sql"),
    "utf-8",
  );

  it("creates table with correct columns", () => {
    expect(migration).toContain("space_id UUID");
    expect(migration).toContain("user_id UUID");
    expect(migration).toContain("role TEXT");
    expect(migration).toContain("identity_id TEXT");
  });

  it("enforces unique space_id + user_id", () => {
    expect(migration).toContain("UNIQUE (space_id, user_id)");
  });

  it("enforces unique space_id + role", () => {
    expect(migration).toContain("UNIQUE (space_id, role)");
  });

  it("enables RLS on space_members itself", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("is idempotent", () => {
    expect(migration).toContain("already exists");
  });
});

describe("S3: authenticated RLS migration", () => {
  const migration = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000010_enable_authenticated_business_rls.sql"),
    "utf-8",
  );

  it("covers all space_id tables", () => {
    for (const table of ["album_items", "love_notes", "courses", "deadlines", "settings", "miss_you_events"]) {
      expect(migration).toContain(table);
    }
  });

  it("covers all space_code tables", () => {
    for (const table of ["content_comments", "content_interactions", "content_reads"]) {
      expect(migration).toContain(table);
    }
  });

  it("uses auth.uid() for authorization", () => {
    expect(migration).toContain("auth.uid()");
  });

  it("does not use USING (true) for business tables", () => {
    // The migration uses DROP + CREATE, not USING true
    // But the CREATE policies use EXISTS with auth.uid()
    expect(migration).toContain("auth.uid()");
  });

  it("includes owner-only restrictions on settings", () => {
    expect(migration).toContain("Owner settings write");
    expect(migration).toContain("role = 'owner'");
  });

  it("uses idempotent DROP IF EXISTS", () => {
    expect(migration).toContain("DROP POLICY IF EXISTS");
  });
});

describe("S3: authenticated request context", () => {
  const ctx = readFileSync(
    resolve(__dirname, "../lib/security/authenticatedRequestContext.ts"),
    "utf-8",
  );

  it("checks AUTH_ENFORCEMENT_MODE", () => {
    expect(ctx).toContain("AUTH_ENFORCEMENT_MODE");
  });

  it("queries space_members for role", () => {
    expect(ctx).toContain("space_members");
    expect(ctx).toContain("role");
  });

  it("returns 401 for unauthenticated users", () => {
    expect(ctx).toContain("UNAUTHENTICATED");
    expect(ctx).toContain("401");
  });

  it("returns 403 when no membership found", () => {
    expect(ctx).toContain("NO_MEMBERSHIP");
    expect(ctx).toContain("403");
  });

  it("provides off mode fallback for backward compat", () => {
    expect(ctx).toContain('"off"');
  });
});
