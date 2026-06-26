import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_SETTINGS_KEY,
  DEFAULT_BACKGROUND_SETTINGS,
  defaultBackgroundSettings,
  getBackgroundSettings,
  getBackgroundOverlayStyle,
  getBackgroundStyle,
  normalizeBackgroundSettings,
  saveBackgroundSettings,
  sanitizeBackgroundSettingsForCloud
} from "@/lib/background";
import { buildBackgroundImagePath } from "@/lib/backgroundUpload";
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
      focalPoint: { x: 50, y: 38 },
      overlay: "light",
      blur: false,
      dim: 20,
      scale: 100
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
    expect(getBackgroundStyle({ mode: "cloudImage", cloudImageUrl: "https://example.com/cloud.webp" }).backgroundImage).toContain("https://example.com/cloud.webp");
  });

  it("saves and reads background settings from localStorage", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    saveBackgroundSettings({ mode: "color", color: "#FDF2F8" });

    expect(storage.getItem(BACKGROUND_SETTINGS_KEY)).toContain("#FDF2F8");
    expect(getBackgroundSettings()).toMatchObject({ mode: "color", color: "#FDF2F8" });
  });

  it("saveBackgroundSettings handles uploaded image data", () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    const settings = saveBackgroundSettings({ mode: "image", imageDataUrl: "data:image/webp;base64,abc" });

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

  it("keeps cloud image metadata for cloud settings", () => {
    const sanitized = sanitizeBackgroundSettingsForCloud({
      mode: "cloudImage",
      cloudImageUrl: "https://example.com/bg.webp",
      cloudImagePath: "xiaoguai520/backgrounds/bg.webp",
      imageDataUrl: "data:image/png;base64,abc"
    });

    expect(sanitized.mode).toBe("cloudImage");
    expect(sanitized.cloudImageUrl).toBe("https://example.com/bg.webp");
    expect(sanitized.cloudImagePath).toBe("xiaoguai520/backgrounds/bg.webp");
    expect(sanitized.imageDataUrl).toBeUndefined();
  });

  it("builds immutable background upload paths under the default code folder", () => {
    const path = buildBackgroundImagePath("xiaoguai520", "webp", "me");
    expect(path).toMatch(
      /^xiaoguai520\/me\/\d{4}\/\d{2}\/backgrounds\/[0-9a-f-]{36}\.webp$/,
    );
  });

  it("exports the uppercase default constant", () => {
    expect(DEFAULT_BACKGROUND_SETTINGS).toEqual(defaultBackgroundSettings);
  });

  it("generates soft portrait styles for people photos", () => {
    const style = getBackgroundStyle({
      mode: "image",
      imageDataUrl: "data:image/png;base64,abc",
      imageFit: "softPortrait",
      focalPoint: { x: 50, y: 35 },
      scale: 108
    });

    expect(style.backgroundSize).toBe("cover");
    expect(style.backgroundPosition).toBe("50% 35%");
  });

  it("uses focal point for image background position", () => {
    expect(getBackgroundStyle({
      mode: "url",
      imageUrl: "https://example.com/bg.webp",
      focalPoint: { x: 24, y: 32 }
    }).backgroundPosition).toBe("24% 32%");
  });

  it("keeps a safe dim default and clamps invalid values", () => {
    const normalized = normalizeBackgroundSettings({
      mode: "image",
      imageDataUrl: "data:image/png;base64,abc",
      dim: 999,
      scale: 10,
      focalPoint: { x: -20, y: 140 }
    });

    expect(normalized.dim).toBe(80);
    expect(normalized.scale).toBe(90);
    expect(normalized.focalPoint).toEqual({ x: 0, y: 100 });
  });

  it("falls back to default for invalid background settings", () => {
    expect(normalizeBackgroundSettings({ mode: "bad", imageFit: "stretch" })).toMatchObject(DEFAULT_BACKGROUND_SETTINGS);
  });
});
