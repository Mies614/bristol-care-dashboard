import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("PWA manifest", () => {
  const manifestPath = resolve(__dirname, "../public/manifest.json");

  it("exists and is valid JSON", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    expect(manifest).toBeDefined();
  });

  it("has required PWA fields", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
  });

  it("has valid icons array", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(1);

    const icon = manifest.icons[0];
    expect(icon.src).toBe("/icon.svg");
    expect(icon.type).toBe("image/svg+xml");
  });

  it("has portrait orientation for mobile", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    expect(manifest.orientation).toBe("portrait");
  });

  it("does not contain sensitive keys", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    expect(raw).not.toContain("NEXT_PUBLIC_SUPABASE");
    expect(raw).not.toContain("VAPID_PRIVATE_KEY");
    expect(raw).not.toContain("ADMIN_PASSWORD");
    expect(raw).not.toContain("service_role");
  });
});
