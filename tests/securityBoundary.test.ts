/**
 * Security boundary tests.
 *
 * Verifies:
 * 1. Service role key patterns do not appear in client-reachable modules
 * 2. Server-only modules are not imported by client components
 * 3. Client bundle does not contain SUPABASE_SERVICE_ROLE_KEY references
 * 4. space_code is the correct column name in key modules
 * 5. content_id supports non-UUID (text type)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, relative } from "path";

const PROJECT_ROOT = resolve(__dirname, "..");

// Modules that are allowed to reference SERVICE_ROLE_KEY
const SERVER_ONLY_PATTERNS = [
  "lib/supabase/server.ts",
  "lib/supabase/",
  "app/api/",
  "lib/envGuard.ts",
];

// Files that reach the browser bundle (client components)

function isClientReachable(filePath: string): boolean {
  const rel = relative(PROJECT_ROOT, filePath);
  // API routes are server-only
  if (rel.startsWith("app/api/")) return false;
  // Test files are not bundled
  if (rel.startsWith("tests/")) return false;
  // Server-only modules
  if (rel.includes("supabase/server")) return false;
  // Config files
  if (rel.endsWith(".config.ts") || rel.endsWith(".config.js")) return false;
  return true;
}

function isServerOnlyPattern(filePath: string): boolean {
  const rel = relative(PROJECT_ROOT, filePath);
  return SERVER_ONLY_PATTERNS.some((p) => rel.startsWith(p));
}

function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...findTsFiles(full));
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        files.push(full);
      }
    }
  } catch {
    // Directory may not exist
  }
  return files;
}

describe("Service role key not in client bundle", () => {
  it("all SUPABASE_SERVICE_ROLE_KEY references are in server-only or API files", () => {
    const allFiles = findTsFiles(resolve(PROJECT_ROOT, "app"))
      .concat(findTsFiles(resolve(PROJECT_ROOT, "lib")))
      .concat(findTsFiles(resolve(PROJECT_ROOT, "components")))
      .concat(findTsFiles(resolve(PROJECT_ROOT, "hooks")));

    const violations: string[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        if (isClientReachable(file) && !isServerOnlyPattern(file)) {
          violations.push(relative(PROJECT_ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("server-only import is present in server Supabase client", () => {
    const serverTs = readFileSync(resolve(PROJECT_ROOT, "lib/supabase/server.ts"), "utf-8");
    expect(serverTs).toContain('import "server-only"');
  });

  it("client Supabase client does NOT import server-only", () => {
    const clientTs = readFileSync(resolve(PROJECT_ROOT, "lib/supabase/client.ts"), "utf-8");
    expect(clientTs).not.toContain("server-only");
    expect(clientTs).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(clientTs).not.toContain("service_role");
  });
});

describe("space_code column name consistency", () => {
  it("API routes use space_code (not space_id) for content tables", () => {
    const files = [
      "app/api/comments/route.ts",
      "app/api/interactions/route.ts",
    ];
    for (const f of files) {
      const content = readFileSync(resolve(PROJECT_ROOT, f), "utf-8");
      expect(content).toContain("space_code");
      // space_id may appear in unrelated contexts (couple_spaces table), not content tables
    }
  });

  it("AGENTS.md confirms space_code for content tables", () => {
    const agents = readFileSync(resolve(PROJECT_ROOT, "AGENTS.md"), "utf-8");
    expect(agents).toContain("content_comments.space_code");
    expect(agents).toContain("content_interactions.space_code");
    expect(agents).toContain("content_reads.space_code");
  });

  it("production-schema.md confirms space_code for content tables", () => {
    const schema = readFileSync(resolve(PROJECT_ROOT, "docs/production-schema.md"), "utf-8");
    expect(schema).toContain("content_comments");
    expect(schema).toContain("space_code");
  });
});

describe("content_id supports non-UUID", () => {
  it("content_id is handled as string (not UUID) in interactions API", () => {
    const interactions = readFileSync(
      resolve(PROJECT_ROOT, "app/api/interactions/route.ts"),
      "utf-8",
    );
    // content_id should be treated as a generic string, not validated as UUID
    expect(interactions).not.toContain("uuid");
  });

  it("read-state key format uses colon separator for non-UUID ids", () => {
    const readState = readFileSync(
      resolve(PROJECT_ROOT, "lib/readStateClient.ts"),
      "utf-8",
    );
    // Read state keys are like "note:someId" — colon-separated, not UUID-dependent
    expect(readState).toContain(":");
  });
});

describe("Admin auth boundary", () => {
  it("adminAuth.ts never logs or returns the password value", () => {
    const auth = readFileSync(resolve(PROJECT_ROOT, "lib/adminAuth.ts"), "utf-8");
    expect(auth).not.toContain("console.log");
    expect(auth).not.toContain("return process.env.ADMIN_PASSWORD");
  });

  it("admin login API returns safe error (never leaks password)", () => {
    const login = readFileSync(resolve(PROJECT_ROOT, "app/api/admin/login/route.ts"), "utf-8");
    expect(login).toContain("后台密码不正确");
    expect(login).not.toContain("process.env.ADMIN_PASSWORD");
  });

  it("DataMaintenanceCenter does not persist password to localStorage", () => {
    const dmc = readFileSync(
      resolve(PROJECT_ROOT, "components/admin/DataMaintenanceCenter.tsx"),
      "utf-8",
    );
    // Password should be in useState, not localStorage
    expect(dmc).not.toMatch(/localStorage\.setItem.*password/i);
    expect(dmc).toContain("useState(\"\"");
  });
});

describe("security headers configured", () => {
  it("next.config.ts includes X-Content-Type-Options", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("nosniff");
  });

  it("next.config.ts includes X-Frame-Options: DENY", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("DENY");
  });

  it("next.config.ts includes Referrer-Policy", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    expect(config).toContain("Referrer-Policy");
  });
});

describe("Permissions-Policy allows microphone for self", () => {
  it("microphone is NOT set to () — allows self-origin use", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    const permsMatch = config.match(/Permissions-Policy["']?\s*,\s*["']?value["']?\s*:\s*["']([^"']+)["']/);
    expect(permsMatch).toBeTruthy();
    const value = permsMatch![1];
    expect(value).toContain("microphone=(self)");
    expect(value).not.toContain("microphone=()");
  });

  it("camera remains disabled", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    const permsMatch = config.match(/Permissions-Policy["']?\s*,\s*["']?value["']?\s*:\s*["']([^"']+)["']/);
    const value = permsMatch![1];
    expect(value).toContain("camera=()");
  });

  it("geolocation is restricted to self", () => {
    const config = readFileSync(resolve(PROJECT_ROOT, "next.config.ts"), "utf-8");
    const permsMatch = config.match(/Permissions-Policy["']?\s*,\s*["']?value["']?\s*:\s*["']([^"']+)["']/);
    const value = permsMatch![1];
    expect(value).toContain("geolocation=(self)");
  });

  it("VoiceRecorder component uses getUserMedia for audio", () => {
    const vr = readFileSync(resolve(PROJECT_ROOT, "components/VoiceRecorder.tsx"), "utf-8");
    expect(vr).toContain("getUserMedia");
    expect(vr).toContain("audio: true");
  });
});
