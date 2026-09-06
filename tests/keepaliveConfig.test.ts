import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const routePath = resolve(__dirname, "../app/api/keepalive/route.ts");
const workflowPath = resolve(__dirname, "../.github/workflows/supabase-keepalive.yml");

describe("Supabase keepalive", () => {
  it("uses a protected, read-only database check", () => {
    const route = readFileSync(routePath, "utf-8");
    expect(route).toContain("SUPABASE_KEEPALIVE_SECRET");
    expect(route).toContain('.from("couple_spaces")');
    expect(route).toContain('.select("id", { count: "exact", head: true })');
    expect(route).not.toContain('.select("*")');
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("calls the endpoint twice weekly", () => {
    expect(existsSync(workflowPath)).toBe(true);
    const workflow = readFileSync(workflowPath, "utf-8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain('cron: "17 3 * * 1,4"');
    expect(workflow).toContain("SUPABASE_KEEPALIVE_URL");
    expect(workflow).toContain("SUPABASE_KEEPALIVE_SECRET");
    expect(workflow).toContain("Authorization: Bearer ${KEEPALIVE_SECRET}");
  });
});
