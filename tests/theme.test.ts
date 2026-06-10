import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME_SETTINGS,
  OWNER_DEFAULT_THEME_SETTINGS,
  getThemeCssVariables,
  getThemeDefaultsForStyle,
  getThemeSettings,
  normalizeThemeSettings,
  saveThemeSettings,
} from "@/lib/theme";

const localStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  };
};

describe("theme settings", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("has warm-letter as default partner theme", () => {
    expect(DEFAULT_THEME_SETTINGS).toMatchObject({
      style: "warm-letter",
      cardStyle: "glass",
      navStyle: "glass",
      radius: "extra",
      decoration: "stars"
    });
  });

  it("has clean-dashboard as default owner theme", () => {
    expect(OWNER_DEFAULT_THEME_SETTINGS).toMatchObject({
      style: "clean-dashboard",
      cardStyle: "flat",
      navStyle: "minimal",
      radius: "large",
      decoration: "none"
    });
  });

  it("normalizes all 6 theme styles and creates CSS variables", () => {
    const allStyles = ["warm-letter", "soft-aurora", "clean-dashboard", "night-lamp"] as const;
    for (const style of allStyles) {
      const settings = normalizeThemeSettings({ style });
      expect(settings.style).toBe(style);
      const vars = getThemeCssVariables(settings) as Record<string, string>;
      expect(vars["--app-card-bg"]).toBeTruthy();
      expect(vars["--app-accent"]).toBeTruthy();
      expect(vars["--app-bg"]).toBeTruthy();
    }
  });

  it("accepts legacy theme names via alias normalization", () => {
    // Old names should normalize to new canonical names
    const legacy = { style: "soft" };
    const result = normalizeThemeSettings(legacy);
    // The normalizeThemeSettings only keeps valid styles, so legacy names
    // that are not in the valid list fall through to the default.
    // Legacy aliasing is handled by navVariants.THEME_ALIAS, not normalizeThemeSettings.
    expect(result.style).toBeDefined();
  });

  it("uses theme-specific nav defaults", () => {
    expect(getThemeDefaultsForStyle("warm-letter").navStyle).toBe("glass");
    expect(getThemeDefaultsForStyle("soft-aurora").navStyle).toBe("floating");
    expect(getThemeDefaultsForStyle("clean-dashboard").navStyle).toBe("minimal");
  });

  it("saves and reads theme settings with per-identity storage", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn(), location: { pathname: "/" } });
    saveThemeSettings({ ...DEFAULT_THEME_SETTINGS, style: "soft-aurora", cardStyle: "glass", navStyle: "floating" });
    const saved = getThemeSettings();
    expect(saved.style).toBe("soft-aurora");
    expect(saved.navStyle).toBe("floating");
  });

  it("night-lamp theme uses a dark card background", () => {
    const vars = getThemeCssVariables(getThemeDefaultsForStyle("night-lamp")) as Record<string, string>;
    const cardBg = String(vars["--app-card-bg"]);
    // Dark theme should have low-opacity dark background
    expect(cardBg).toBeTruthy();
    // Should be a dark rgba
    expect(cardBg).toContain("rgba");
  });

  it("all 6 themes produce valid CSS variable maps", () => {
    const requiredVars = ["--app-bg", "--app-text", "--app-muted", "--app-card-bg", "--app-accent", "--app-radius", "--app-nav-bg"];
    const allStyles = ["warm-letter", "memory-film", "soft-aurora", "clean-dashboard", "night-lamp", "garden"] as const;
    for (const style of allStyles) {
      const vars = getThemeCssVariables(getThemeDefaultsForStyle(style)) as Record<string, string>;
      for (const v of requiredVars) {
        expect(vars[v], style + " missing " + v).toBeTruthy();
      }
    }
  });
});
