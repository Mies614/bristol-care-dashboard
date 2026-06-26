import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const PROJECT_ROOT = resolve(__dirname, "..");
const CLIENT_DIRS = ["app", "components", "hooks", "lib"];
const BUSINESS_TABLES = [
  "love_notes",
  "album_items",
  "content_comments",
  "content_interactions",
  "content_reads",
  "space_locations",
  "miss_you_events",
  "settings",
  "courses",
  "deadlines",
  "period_records",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    if (stat.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function isServerFile(file: string): boolean {
  const rel = relative(PROJECT_ROOT, file);
  return (
    rel.startsWith("app/api/") ||
    rel.startsWith("lib/api/") ||
    rel.includes("/supabase/server") ||
    rel === "lib/supabase/settings.ts" ||
    rel.startsWith("tests/") ||
    rel.endsWith(".test.ts")
  );
}

describe("no browser business database access", () => {
  it("client-reachable modules do not call supabase.from on business tables", () => {
    const files = CLIENT_DIRS.flatMap((dir) => walk(resolve(PROJECT_ROOT, dir)));
    const violations: string[] = [];

    for (const file of files) {
      if (isServerFile(file)) continue;
      const src = readFileSync(file, "utf-8");
      for (const table of BUSINESS_TABLES) {
        if (src.includes(`.from("${table}")`) || src.includes(`.from('${table}')`)) {
          violations.push(`${relative(PROJECT_ROOT, file)} -> ${table}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
