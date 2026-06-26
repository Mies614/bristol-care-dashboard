import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sql = readFileSync(
  resolve(__dirname, "../docs/security/production-rls-verification.sql"),
  "utf-8",
);

function stripSqlComments(input: string): string {
  return input
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

describe("production Supabase verification SQL", () => {
  const executableSql = stripSqlComments(sql);

  it("uses only read-only statement entry points", () => {
    const statements = executableSql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(/^(select|with|explain)\b/i);
    }
  });

  it("does not include write or privilege-changing SQL statements", () => {
    expect(executableSql).not.toMatch(/\b(alter|create|drop|insert|update|delete|truncate|grant|revoke)\b/i);
  });

  it("captures RLS, policy, grants, columns, indexes and constraints", () => {
    expect(sql).toContain("relrowsecurity");
    expect(sql).toContain("pg_policies");
    expect(sql).toContain("information_schema.columns");
    expect(sql).toContain("information_schema.table_constraints");
    expect(sql).toContain("pg_indexes");
    expect(sql).toContain("information_schema.role_table_grants");
  });

  it("captures Supabase Storage bucket and storage.objects policy metadata", () => {
    expect(sql).toContain("storage.buckets");
    expect(sql).toContain("schemaname = 'storage'");
    expect(sql).toContain("tablename = 'objects'");
  });

  it("does not query business table rows or counts", () => {
    expect(executableSql).not.toMatch(/from\s+love_notes\b/i);
    expect(executableSql).not.toMatch(/from\s+album_items\b/i);
    expect(executableSql).not.toMatch(/from\s+content_(comments|interactions|reads)\b/i);
    expect(executableSql).not.toMatch(/count\s*\(/i);
  });
});
