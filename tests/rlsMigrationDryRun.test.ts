import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const dryRunDoc = readFileSync(
  resolve(__dirname, "../docs/security/phase-s2-migration-dry-run.md"),
  "utf-8",
);
const deploymentDoc = readFileSync(
  resolve(__dirname, "../docs/security/phase-s2-production-deployment.md"),
  "utf-8",
);

describe("RLS migration dry run status", () => {
  it("does not claim the non-production database dry run has completed", () => {
    expect(dryRunDoc).toContain("Not completed in this Codex run");
    expect(dryRunDoc).toContain("Docker daemon: unavailable");
  });

  it("requires fake data and non-production targets only", () => {
    expect(dryRunDoc).toContain("Never use production");
    expect(dryRunDoc).toContain("anonymous fake rows only");
  });

  it("keeps production deployment blocked until dry run and production verification pass", () => {
    expect(deploymentDoc).toContain("Not ready for production deployment");
    expect(deploymentDoc).toContain("non-production migration dry run succeeds");
  });
});
