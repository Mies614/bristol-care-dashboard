import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const files = [
  "01-public-tables-rls.sql",
  "02-public-policies.sql",
  "03-public-columns.sql",
  "04-public-indexes.sql",
  "05-public-constraints.sql",
  "06-public-grants.sql",
  "07-storage-buckets.sql",
  "08-storage-object-policies.sql",
  "09-storage-object-grants.sql",
];

function loadSql(file: string): string {
  return readFileSync(
    resolve(__dirname, "../docs/security/production-verification", file),
    "utf-8",
  );
}

function stripSqlComments(input: string): string {
  return input
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

const DDL_DML_KEYWORDS =
  /\b(alter|create|drop|insert|update|delete|truncate|grant|revoke)\b/i;

describe("production Supabase verification split files", () => {
  for (const file of files) {
    describe(file, () => {
      const raw = loadSql(file);
      const executable = stripSqlComments(raw);

      it("contains executable SQL", () => {
        expect(executable.length).toBeGreaterThan(0);
      });

      it("uses only read-only statement entry points", () => {
        const statements = executable
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        expect(statements.length).toBeGreaterThan(0);
        for (const stmt of statements) {
          expect(stmt).toMatch(/^(select|with|explain)\b/i);
        }
      });

      it("does not include write or privilege-changing SQL", () => {
        expect(executable).not.toMatch(DDL_DML_KEYWORDS);
      });

      it("does not query business table rows directly", () => {
        expect(executable).not.toMatch(/from\s+love_notes\b/i);
        expect(executable).not.toMatch(/from\s+album_items\b/i);
        expect(executable).not.toMatch(/from\s+miss_you_events\b/i);
        expect(executable).not.toMatch(/from\s+content_(comments|interactions|reads)\b/i);
        expect(executable).not.toMatch(/count\s*\(/i);
      });
    });
  }

  it("files exist on disk", () => {
    for (const file of files) {
      const raw = loadSql(file);
      expect(raw.length).toBeGreaterThan(0);
    }
  });

  it("README.md exists", () => {
    const readme = readFileSync(
      resolve(__dirname, "../docs/security/production-verification/README.md"),
      "utf-8",
    );
    expect(readme.length).toBeGreaterThan(0);
    expect(readme).toContain("Production Supabase Verification");
    expect(readme).toContain("01-public-tables-rls.sql");
    expect(readme).toContain("09-storage-object-grants.sql");
  });

  describe("content sanity", () => {
    const allSql = files.map((f) => loadSql(f)).join("\n");

    it("captures RLS status across split files", () => {
      expect(allSql).toContain("relrowsecurity");
      expect(allSql).toContain("pg_policies");
    });

    it("captures schema structure metadata", () => {
      expect(allSql).toContain("information_schema.columns");
      expect(allSql).toContain("information_schema.table_constraints");
      expect(allSql).toContain("pg_indexes");
      expect(allSql).toContain("information_schema.role_table_grants");
    });

    it("captures storage bucket and object policy metadata", () => {
      expect(allSql).toContain("storage.buckets");
      expect(allSql).toContain("schemaname = 'storage'");
      expect(allSql).toContain("tablename = 'objects'");
    });
  });
});
