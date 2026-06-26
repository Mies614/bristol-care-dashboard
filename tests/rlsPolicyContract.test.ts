import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const enableMigration = readFileSync(
  resolve(__dirname, "../supabase/migrations/20260626000000_enable_business_rls.sql"),
  "utf-8",
);
const rollbackMigration = readFileSync(
  resolve(__dirname, "../supabase/migrations/20260626000001_rollback_business_rls.sql"),
  "utf-8",
);

describe("RLS migration contract", () => {
  it("is clearly marked as draft until production verification is complete", () => {
    expect(enableMigration).toContain("DRAFT");
    expect(enableMigration).toContain("DO NOT APPLY UNTIL PRODUCTION RLS VERIFICATION IS COMPLETE");
  });

  it("does not contain pseudo-RLS allow-all policies", () => {
    expect(enableMigration).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(enableMigration).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
  });

  it("does not hard-code public space-code authorization predicates", () => {
    expect(enableMigration).not.toMatch(/space_code\s*=\s*'xiaoguai520'/i);
    expect(enableMigration).not.toMatch(/current_setting\s*\(\s*'app\.space_code'/i);
  });

  it("keeps content_id as text and validates the known space_code text columns", () => {
    expect(enableMigration).toContain("content_interactions");
    expect(enableMigration).toContain("content_comments");
    expect(enableMigration).toContain("content_reads");
    expect(enableMigration).toContain("space_locations");
    expect(enableMigration).toContain("c.data_type = 'text'");
    expect(enableMigration).not.toMatch(/content_id.+uuid/i);
  });

  it("rollback covers every S2 policy name referenced by the enable migration", () => {
    const policies = [...enableMigration.matchAll(/"s2 service api only [^"]+"/g)].map((m) => m[0]);
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of new Set(policies)) {
      expect(rollbackMigration).toContain(policy);
    }
  });
});
