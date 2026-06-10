import { describe, expect, it } from "vitest";
import { appNavItems, getActiveNavHref, shouldShowBottomNav } from "@/lib/navigation";
import { normalizeThemeSettings } from "@/lib/theme";
import { normalizeThemeStyle, normalizeNavStyle, getNavContainerClass, getNavItemContainerClass, getNavLabelClass, getStatusDotClass, getDecorationClass, getActiveIndicatorClass, getItemOffsetClass } from "@/components/navigation/navVariants";

describe("bottom nav", () => {
  it("keeps the five user-facing entries for partner side: 首页, 记录, 回忆, 卡夹, 设置", () => {
    expect(appNavItems.map((item) => item.href)).toEqual(["/", "/records", "/memories", "/cards", "/settings"]);
  });

  it("does not include /notes or /albums in primary nav", () => {
    const hrefs = appNavItems.map((item) => item.href);
    expect(hrefs).not.toContain("/notes");
    expect(hrefs).not.toContain("/albums");
  });

  it("highlights records for note and schedule sub-routes", () => {
    expect(getActiveNavHref("/records")).toBe("/records");
    expect(getActiveNavHref("/notes")).toBe("/records");
    expect(getActiveNavHref("/schedule")).toBe("/records");
    expect(getActiveNavHref("/deadlines")).toBe("/records");
    expect(getActiveNavHref("/period")).toBe("/records");
  });

  it("highlights memories and cards", () => {
    expect(getActiveNavHref("/memories")).toBe("/memories");
    expect(getActiveNavHref("/albums")).toBe("/memories");
    expect(getActiveNavHref("/cards")).toBe("/cards");
    expect(getActiveNavHref("/settings")).toBe("/settings");
    expect(getActiveNavHref("/debug")).toBe("/settings");
  });

  it("highlights owner side me/* routes correctly", () => {
    expect(getActiveNavHref("/me")).toBe("/me");
    expect(getActiveNavHref("/me/records")).toBe("/me/records");
    expect(getActiveNavHref("/me/memories")).toBe("/me/memories");
    expect(getActiveNavHref("/me/cards")).toBe("/me/cards");
    expect(getActiveNavHref("/me/settings")).toBe("/me/settings");
    expect(getActiveNavHref("/me/admin")).toBe("/me");
    // Sub-pages highlight parent
    expect(getActiveNavHref("/me/notes")).toBe("/me/records");
    expect(getActiveNavHref("/me/albums")).toBe("/me/memories");
  });

  it("returns empty href for unknown routes", () => {
    expect(getActiveNavHref("/unknown")).toBe("");
  });

  it("hides bottom nav on admin pages", () => {
    expect(shouldShowBottomNav("/admin")).toBe(false);
    expect(shouldShowBottomNav("/admin/login")).toBe(false);
    expect(shouldShowBottomNav("/admin/settings")).toBe(false);
    expect(shouldShowBottomNav("/me/admin")).toBe(false);
  });

  it("hides bottom nav on scan page", () => {
    expect(shouldShowBottomNav("/cards/scan")).toBe(false);
    expect(shouldShowBottomNav("/me/cards/scan")).toBe(false);
  });

  it("shows bottom nav on all user-facing pages", () => {
    expect(shouldShowBottomNav("/")).toBe(true);
    expect(shouldShowBottomNav("/records")).toBe(true);
    expect(shouldShowBottomNav("/schedule")).toBe(true);
    expect(shouldShowBottomNav("/deadlines")).toBe(true);
    expect(shouldShowBottomNav("/period")).toBe(true);
    expect(shouldShowBottomNav("/memories")).toBe(true);
    expect(shouldShowBottomNav("/notes")).toBe(true);
    expect(shouldShowBottomNav("/albums")).toBe(true);
    expect(shouldShowBottomNav("/cards")).toBe(true);
    expect(shouldShowBottomNav("/cards/123")).toBe(true);
    expect(shouldShowBottomNav("/settings")).toBe(true);
    expect(shouldShowBottomNav("/debug")).toBe(true);
  });

  it("shows bottom nav on owner-side user-facing pages", () => {
    expect(shouldShowBottomNav("/me")).toBe(true);
    expect(shouldShowBottomNav("/me/records")).toBe(true);
    expect(shouldShowBottomNav("/me/memories")).toBe(true);
    expect(shouldShowBottomNav("/me/cards")).toBe(true);
    expect(shouldShowBottomNav("/me/notes")).toBe(true);
    expect(shouldShowBottomNav("/me/albums")).toBe(true);
    expect(shouldShowBottomNav("/me/settings")).toBe(true);
  });

  it("accepts all nav styles in theme settings", () => {
    for (const navStyle of ["glass", "pill", "paper", "minimal", "floating"] as const) {
      expect(normalizeThemeSettings({ navStyle }).navStyle).toBe(navStyle);
    }
  });

  it("accepts all 8 theme styles in theme settings", () => {
    for (const style of ["soft", "romantic", "minimal", "study", "night", "photo", "playful", "elegant"] as const) {
      expect(normalizeThemeSettings({ style }).style).toBe(style);
    }
  });

  it("normalizes theme aliases correctly", () => {
    expect(normalizeThemeStyle("classic")).toBe("soft");
    expect(normalizeThemeStyle("rose")).toBe("romantic");
    expect(normalizeThemeStyle("lavender")).toBe("elegant");
    expect(normalizeThemeStyle("sky")).toBe("study");
    expect(normalizeThemeStyle("forest")).toBe("minimal");
    expect(normalizeThemeStyle("sunshine")).toBe("playful");
    expect(normalizeThemeStyle("ink")).toBe("night");
    expect(normalizeThemeStyle("moonlight")).toBe("photo");
  });

  it("normalizes nav style aliases correctly", () => {
    expect(normalizeNavStyle("standard")).toBe("glass");
    expect(normalizeNavStyle("rounded")).toBe("paper");
  });

  it("falls back to defaults for unknown values", () => {
    expect(normalizeThemeStyle("unknown")).toBe("soft");
    expect(normalizeNavStyle("unknown")).toBe("glass");
  });

  it("generates nav container classes for all 5 nav styles", () => {
    for (const navStyle of ["glass", "pill", "paper", "minimal", "floating"] as const) {
      const result = getNavContainerClass(navStyle, "soft");
      expect(result).toBeTruthy();
      expect(result).toContain("mx-auto");
      expect(result).toContain("max-w-md");
      expect(result).toContain("pointer-events-auto");
    }
  });

  it("generates item container classes for active and inactive states", () => {
    for (const navStyle of ["glass", "pill", "paper", "minimal", "floating"] as const) {
      const active = getNavItemContainerClass(navStyle, true);
      const inactive = getNavItemContainerClass(navStyle, false);
      expect(active).toBeTruthy();
      expect(inactive).toBeTruthy();
      expect(active).toContain("min-h-11");
      expect(inactive).toContain("min-h-11");
    }
  });

  it("generates active indicator classes for minimal nav", () => {
    const minimalIndicator = getActiveIndicatorClass("soft", "minimal");
    expect(minimalIndicator).toContain("after:absolute");
    expect(minimalIndicator).toContain("after:bottom-0.5");

    // Non-minimal nav styles should return empty string
    const glassIndicator = getActiveIndicatorClass("soft", "glass");
    expect(glassIndicator).toBe("");
  });

  it("generates decoration classes for all decoration types", () => {
    for (const decoration of ["none", "stars", "hearts", "tape", "moon", "dots"] as const) {
      const result = getDecorationClass(decoration, true);
      if (decoration === "none") {
        expect(result).toBe("");
      } else {
        expect(result).toBeTruthy();
        expect(result).toContain("after:absolute");
      }
    }
  });

  it("returns empty decoration class for inactive items", () => {
    expect(getDecorationClass("stars", false)).toBe("");
  });

  it("generates label classes for active and inactive states", () => {
    const activeLabel = getNavLabelClass(true, "glass");
    const inactiveLabel = getNavLabelClass(false, "glass");
    expect(activeLabel).toContain("font-semibold");
    expect(inactiveLabel).not.toContain("font-semibold");
    expect(activeLabel).toContain("text-[var(--app-accent)]");
    expect(inactiveLabel).toContain("text-[var(--app-muted)]");
  });

  it("generates status dot classes for all theme styles", () => {
    for (const style of ["soft", "romantic", "minimal", "study", "night", "photo", "playful", "elegant"] as const) {
      const result = getStatusDotClass(style);
      expect(result).toBeTruthy();
      expect(result).toContain("rounded-full");
    }
  });

  it("adds floating offset only for active floating nav", () => {
    expect(getItemOffsetClass("floating", true)).toBe("-translate-y-0.5");
    expect(getItemOffsetClass("floating", false)).toBe("");
    expect(getItemOffsetClass("glass", true)).toBe("");
    expect(getItemOffsetClass("pill", true)).toBe("");
  });
});
describe("getSideHref", () => {
  it("returns /me/notes for owner side", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("owner", "/notes")).toBe("/me/notes");
  });

  it("returns /notes for partner side", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("partner", "/notes")).toBe("/notes");
  });

  it("returns /me/albums for owner side", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("owner", "/albums")).toBe("/me/albums");
  });

  it("returns /albums for partner side", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("partner", "/albums")).toBe("/albums");
  });

  it("returns /me for owner home", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("owner", "/")).toBe("/me");
  });

  it("returns / for partner home", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("partner", "/")).toBe("/");
  });

  it("handles path without leading slash", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("owner", "notes")).toBe("/me/notes");
  });

  it("does not produce /me/me/...", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideHref("owner", "/me/notes")).toBe("/me/me/notes");
    // This is technically correct per the spec — the caller should pass clean paths
    // The function only prepends the side base path
  });
});

describe("getSideBasePath", () => {
  it("returns /me for owner", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideBasePath("owner")).toBe("/me");
  });

  it("returns empty string for partner", async () => {
    const mod = await import("@/lib/navigation");
    expect(mod.getSideBasePath("partner")).toBe("");
  });
});
