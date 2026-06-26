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

describe("RLS rollback contract", () => {
  it("keeps rollback in draft mode", () => {
    expect(rollbackMigration).toContain("DRAFT ROLLBACK");
    expect(rollbackMigration).toContain("DO NOT APPLY UNTIL PRODUCTION RLS VERIFICATION IS COMPLETE");
  });

  it("does not disable RLS or delete data", () => {
    expect(rollbackMigration).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(rollbackMigration).not.toMatch(/\bdelete\s+from\b/i);
    expect(rollbackMigration).not.toMatch(/\btruncate\b/i);
  });

  it("mentions every S2 policy name used by enable migration", () => {
    const enablePolicies = new Set(
      [...enableMigration.matchAll(/"s2 service api only [^"]+"/g)].map((match) => match[0]),
    );
    expect(enablePolicies.size).toBeGreaterThan(0);
    for (const policy of enablePolicies) {
      expect(rollbackMigration).toContain(policy);
    }
  });
});
