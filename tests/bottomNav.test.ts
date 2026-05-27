import { describe, expect, it } from "vitest";
import { appNavItems, getActiveNavHref } from "@/lib/navigation";
import { normalizeThemeSettings } from "@/lib/theme";

describe("bottom nav", () => {
  it("keeps the five user-facing entries", () => {
    expect(appNavItems.map((item) => item.href)).toEqual(["/", "/records", "/memories", "/cards", "/settings"]);
  });

  it("highlights grouped record and memory routes", () => {
    expect(getActiveNavHref("/records")).toBe("/records");
    expect(getActiveNavHref("/schedule")).toBe("/records");
    expect(getActiveNavHref("/deadlines")).toBe("/records");
    expect(getActiveNavHref("/period")).toBe("/records");
    expect(getActiveNavHref("/memories")).toBe("/memories");
    expect(getActiveNavHref("/notes")).toBe("/memories");
    expect(getActiveNavHref("/albums")).toBe("/memories");
  });

  it("accepts all nav styles in theme settings", () => {
    for (const navStyle of ["glass", "pill", "paper", "minimal"] as const) {
      expect(normalizeThemeSettings({ navStyle }).navStyle).toBe(navStyle);
    }
  });
});
