import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const verificationSql = readFileSync(
  resolve(__dirname, "../docs/security/production-rls-verification.sql"),
  "utf-8",
);
const storageDoc = readFileSync(
  resolve(__dirname, "../docs/security/phase-s2-storage-policy.md"),
  "utf-8",
);

describe("Storage policy contract", () => {
  it("production verification asks for bucket public status and upload constraints", () => {
    expect(verificationSql).toContain("public");
    expect(verificationSql).toContain("file_size_limit");
    expect(verificationSql).toContain("allowed_mime_types");
  });

  it("production verification asks for storage.objects policies and grants", () => {
    expect(verificationSql).toContain("schemaname = 'storage'");
    expect(verificationSql).toContain("tablename = 'objects'");
    expect(verificationSql).toContain("information_schema.role_table_grants");
  });

  it("documents that path prefixes are not authorization", () => {
    expect(storageDoc).toContain("Public bucket plus path prefix is not authorization");
    expect(storageDoc).toContain("Anon upload plus a known prefix is not secure upload");
  });
});
