import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME_SETTINGS,
  getThemeCssVariables,
  getThemeDefaultsForStyle,
  getThemeSettings,
  normalizeThemeSettings,
  saveThemeSettings,
  THEME_SETTINGS_KEY
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

  it("has a soft default theme", () => {
    expect(DEFAULT_THEME_SETTINGS).toMatchObject({
      style: "soft",
      cardStyle: "glass",
      navStyle: "glass",
      radius: "extra",
      decoration: "stars"
    });
  });

  it("normalizes all theme styles and creates variables", () => {
    for (const style of ["soft", "romantic", "minimal", "study", "night", "photo"] as const) {
      const settings = normalizeThemeSettings({ style });
      expect(settings.style).toBe(style);
      expect(getThemeCssVariables(settings)["--app-card-bg"]).toBeTruthy();
    }
  });

  it("uses theme-specific nav defaults", () => {
    expect(getThemeDefaultsForStyle("romantic").navStyle).toBe("pill");
    expect(getThemeDefaultsForStyle("minimal").navStyle).toBe("minimal");
    expect(getThemeDefaultsForStyle("photo").navStyle).toBe("paper");
  });

  it("saves and reads theme settings", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    saveThemeSettings({ ...DEFAULT_THEME_SETTINGS, style: "photo", cardStyle: "solid", navStyle: "paper" });
    expect(storage.getItem(THEME_SETTINGS_KEY)).toContain("photo");
    expect(getThemeSettings()).toMatchObject({ style: "photo", navStyle: "paper" });
  });

  it("photo theme uses a stronger card background", () => {
    expect(String(getThemeCssVariables(getThemeDefaultsForStyle("photo"))["--app-card-bg"])).toContain("0.88");
  });
});
