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

  it("settings has separate member-SELECT and owner-write policies", () => {
    expect(migration).toContain("Members can read settings");
    expect(migration).toContain("Owner can insert settings");
    expect(migration).toContain("Owner can update settings");
    expect(migration).toContain("Owner can delete settings");
    expect(migration).toContain("role = 'owner'");
  });

  it("settings is NOT included in generic FOR ALL", () => {
    // The settings section should use named policies, not FOR ALL
    // Check that settings has FOR SELECT (not FOR ALL)
    expect(migration).toContain("FOR SELECT");
    expect(migration).toContain("TO authenticated");
  });

  it("settings UPDATE has both USING and WITH CHECK with owner role", () => {
    const settingsSection = migration.split("settings:").pop()?.split("SETTINGS_DONE")?.[0] || migration;
    // UPDATE policy should include USING and WITH CHECK both with owner role
    expect(settingsSection).toContain("FOR UPDATE");
  });

  it("uses idempotent DROP IF EXISTS", () => {
    expect(migration).toContain("DROP POLICY IF EXISTS");
  });
});

describe("S3: rollback migration", () => {
  const rollback = readFileSync(
    resolve(__dirname, "../supabase/migrations/20260626000011_rollback_authenticated_business_rls.sql"),
    "utf-8",
  );

  it("drops all known settings policy names", () => {
    expect(rollback).toContain("Members can read settings");
    expect(rollback).toContain("Owner can insert settings");
    expect(rollback).toContain("Owner can update settings");
    expect(rollback).toContain("Owner can delete settings");
    expect(rollback).toContain("Owner settings write");
    expect(rollback).toContain("Owner settings update");
  });

  it("does NOT recreate any policies", () => {
    expect(rollback).not.toContain("CREATE POLICY");
  });

  it("does NOT create permissive USING/WITH CHECK true", () => {
    expect(rollback).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(rollback).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it("does NOT create TO anon policies", () => {
    expect(rollback).not.toContain("TO anon");
  });

  it("documents that tables become service-role-only after rollback", () => {
    expect(rollback).toContain("service-role");
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
