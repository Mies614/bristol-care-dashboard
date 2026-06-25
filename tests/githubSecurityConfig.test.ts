/**
 * GitHub security configuration tests.
 * Verifies CI/CD and security automation files exist and are properly configured.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("GitHub Actions CI", () => {
  const ciPath = resolve(__dirname, "../.github/workflows/ci.yml");

  it("ci.yml exists", () => {
    expect(existsSync(ciPath)).toBe(true);
  });

  it("ci.yml includes lint job", () => {
    const ci = readFileSync(ciPath, "utf-8");
    expect(ci).toContain("lint");
    expect(ci).toContain("npm run lint");
  });

  it("ci.yml includes test job", () => {
    const ci = readFileSync(ciPath, "utf-8");
    expect(ci).toContain("test");
    expect(ci).toContain("npm test");
  });

  it("ci.yml includes build job", () => {
    const ci = readFileSync(ciPath, "utf-8");
    expect(ci).toContain("build");
    expect(ci).toContain("npm run build");
  });

  it("ci.yml does not contain SUPABASE_URL or secret patterns", () => {
    const ci = readFileSync(ciPath, "utf-8");
    expect(ci).not.toContain("SUPABASE_URL");
    expect(ci).not.toContain("SERVICE_ROLE");
    expect(ci).not.toContain("ANON_KEY");
    expect(ci).not.toContain("VAPID_PRIVATE");
    expect(ci).not.toContain("ADMIN_PASSWORD");
  });

  it("ci.yml uses npm ci (not npm install)", () => {
    const ci = readFileSync(ciPath, "utf-8");
    expect(ci).toContain("npm ci");
  });
});

describe("Dependabot", () => {
  const dependabotPath = resolve(__dirname, "../.github/dependabot.yml");

  it("dependabot.yml exists", () => {
    expect(existsSync(dependabotPath)).toBe(true);
  });

  it("configures npm weekly updates", () => {
    const db = readFileSync(dependabotPath, "utf-8");
    expect(db).toContain("npm");
    expect(db).toContain("weekly");
  });

  it("configures github-actions monthly updates", () => {
    const db = readFileSync(dependabotPath, "utf-8");
    expect(db).toContain("github-actions");
    expect(db).toContain("monthly");
  });
});

describe("Git repo hygiene", () => {
  it("no .env file is tracked", () => {
    const gitignore = readFileSync(resolve(__dirname, "../.gitignore"), "utf-8");
    expect(gitignore).toContain(".env");
  });

  it("no test-results directory tracked", () => {
    const gitignore = readFileSync(resolve(__dirname, "../.gitignore"), "utf-8");
    expect(gitignore).toContain("test-results");
  });

  it("no playwright-report tracked", () => {
    const gitignore = readFileSync(resolve(__dirname, "../.gitignore"), "utf-8");
    expect(gitignore).toContain("playwright-report");
  });
});
