import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_SETTINGS_KEY,
  DEFAULT_BACKGROUND_SETTINGS,
  defaultBackgroundSettings,
  getBackgroundSettings,
  getBackgroundOverlayStyle,
  getBackgroundStyle,
  mergeBackgroundSettings,
  normalizeBackgroundSettings,
  saveBackgroundSettings,
  sanitizeBackgroundSettingsForCloud
} from "@/lib/background";
import { validateAppData } from "@/lib/validation";

const localStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
};

describe("background settings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the cream preset by default", () => {
    expect(defaultBackgroundSettings).toMatchObject({
      mode: "preset",
      preset: "cream",
      imageFit: "cover",
      imagePosition: "center",
      overlay: "light",
      blur: false
    });
  });

  it("falls back to default for empty config", () => {
    expect(normalizeBackgroundSettings(null)).toEqual(defaultBackgroundSettings);
  });

  it("generates preset and color styles", () => {
    expect(getBackgroundStyle({ mode: "preset", preset: "lavender" }).background).toContain("#fbf8ff");
    expect(getBackgroundStyle({ mode: "color", color: "#FDF2F8" }).background).toBe("#FDF2F8");
    expect(getBackgroundOverlayStyle({ mode: "preset", preset: "cream", overlay: "medium" }).background).toContain("0.52");
  });

  it("generates image and url background styles", () => {
    expect(getBackgroundStyle({ mode: "image", imageDataUrl: "data:image/png;base64,abc" }).backgroundImage).toContain("data:image/png");
    expect(getBackgroundStyle({ mode: "url", imageUrl: "https://example.com/bg.webp" }).backgroundImage).toContain("https://example.com/bg.webp");
  });

  it("saves and reads background settings from localStorage", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    saveBackgroundSettings({ mode: "color", color: "#FDF2F8" });

    expect(storage.getItem(BACKGROUND_SETTINGS_KEY)).toContain("#FDF2F8");
    expect(getBackgroundSettings()).toMatchObject({ mode: "color", color: "#FDF2F8" });
  });

  it("mergeBackgroundSettings supports uploaded image data", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    const settings = mergeBackgroundSettings({ mode: "image", imageDataUrl: "data:image/webp;base64,abc" });

    expect(settings.mode).toBe("image");
    expect(settings.imageDataUrl).toBe("data:image/webp;base64,abc");
  });

  it("keeps backgroundSettings during full data import validation", () => {
    const data = validateAppData({
      nickname: "小乖",
      nextMeetDate: "",
      note: "hello",
      courses: [],
      deadlines: [],
      links: [],
      backgroundSettings: { mode: "color", color: "#FDF2F8" }
    });

    expect(data.backgroundSettings.mode).toBe("color");
    expect(data.backgroundSettings.color).toBe("#FDF2F8");
  });

  it("does not sync local image data URLs to cloud settings", () => {
    const sanitized = sanitizeBackgroundSettingsForCloud({
      mode: "image",
      imageDataUrl: "data:image/png;base64,abc",
      preset: "pink"
    });

    expect(sanitized.imageDataUrl).toBeUndefined();
    expect(sanitized.mode).toBe("preset");
  });

  it("exports the uppercase default constant", () => {
    expect(DEFAULT_BACKGROUND_SETTINGS).toEqual(defaultBackgroundSettings);
  });
});
