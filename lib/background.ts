import type { BackgroundSettings } from "./types";
import type { CSSProperties } from "react";

export const defaultBackgroundSettings: BackgroundSettings = {
  mode: "preset",
  preset: "cream",
  imageFit: "cover",
  imagePosition: "center",
  focalPoint: { x: 50, y: 38 },
  overlay: "light",
  blur: false,
  blurAmount: 0,
  portraitEnhance: false,
  dim: 20,
  scale: 100,
  contentProtection: "none",
  photoVisibility: 80
};

export const DEFAULT_BACKGROUND_SETTINGS = defaultBackgroundSettings;
export const BACKGROUND_SETTINGS_KEY = "bristol_dashboard_background_settings";
export const BACKGROUND_SETTINGS_CHANGED_EVENT = "background-settings-changed";

const presetBackgrounds: Record<string, string> = {
  cream:    "radial-gradient(circle at top left, rgba(255,232,226,0.95), transparent 30rem), radial-gradient(circle at 88% 8%, rgba(233,245,255,0.95), transparent 26rem), linear-gradient(180deg, #fff8f0 0%, #fffdf9 46%, #f7fbff 100%)",
  pink:     "radial-gradient(circle at top left, rgba(255,214,226,0.95), transparent 28rem), radial-gradient(circle at 85% 12%, rgba(255,239,246,0.9), transparent 26rem), linear-gradient(180deg, #fff5f8 0%, #fffafb 52%, #fff7f0 100%)",
  lavender: "radial-gradient(circle at top left, rgba(231,220,255,0.95), transparent 30rem), radial-gradient(circle at 85% 12%, rgba(235,245,255,0.9), transparent 28rem), linear-gradient(180deg, #fbf8ff 0%, #fffdfb 52%, #f4f0ff 100%)",
  blue:     "radial-gradient(circle at top left, rgba(217,239,255,0.95), transparent 30rem), radial-gradient(circle at 85% 10%, rgba(246,232,255,0.75), transparent 28rem), linear-gradient(180deg, #f3fbff 0%, #fffdf9 52%, #edf7ff 100%)",
  green:    "radial-gradient(circle at top left, rgba(218,244,230,0.95), transparent 30rem), radial-gradient(circle at 85% 12%, rgba(255,236,218,0.75), transparent 28rem), linear-gradient(180deg, #f6fff8 0%, #fffdf9 52%, #eefbf4 100%)",
  dark:     "radial-gradient(circle at top left, rgba(110,84,130,0.55), transparent 28rem), radial-gradient(circle at 85% 12%, rgba(72,101,130,0.55), transparent 28rem), linear-gradient(180deg, #26202d 0%, #332a37 52%, #1f2933 100%)"
};

const overlayBackgrounds: Record<string, string> = {
  none:   "transparent",
  light:  "rgba(255, 250, 246, 0.34)",
  medium: "rgba(255, 250, 246, 0.52)",
  strong: "rgba(255, 250, 246, 0.72)"
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeFocalPoint(value: unknown) {
  if (!isRecord(value)) return { ...defaultBackgroundSettings.focalPoint! };
  return {
    x: clampNumber(value.x, 0, 100, defaultBackgroundSettings.focalPoint!.x),
    y: clampNumber(value.y, 0, 100, defaultBackgroundSettings.focalPoint!.y)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/\S+$/i.test(value.trim());
}

export function normalizeBackgroundSettings(value: unknown): BackgroundSettings {
  if (!isRecord(value)) return { ...defaultBackgroundSettings };
  const mode = ["preset", "color", "image", "url", "cloudImage"].includes(String(value.mode))
    ? value.mode as BackgroundSettings["mode"]
    : defaultBackgroundSettings.mode;
  const preset = ["cream", "pink", "lavender", "blue", "green", "dark"].includes(String(value.preset))
    ? value.preset as BackgroundSettings["preset"]
    : defaultBackgroundSettings.preset;
  const imageFit = ["cover", "contain", "portrait", "softPortrait", "fullPhoto"].includes(String(value.imageFit))
    ? value.imageFit as BackgroundSettings["imageFit"]
    : defaultBackgroundSettings.imageFit;
  const imagePosition = ["center", "top", "bottom", "left", "right"].includes(String(value.imagePosition))
    ? value.imagePosition as BackgroundSettings["imagePosition"]
    : defaultBackgroundSettings.imagePosition;
  const overlay = ["none", "light", "medium", "strong"].includes(String(value.overlay))
    ? value.overlay as BackgroundSettings["overlay"]
    : defaultBackgroundSettings.overlay;
  const contentProtection = ["none", "softPanel", "strongPanel", "gradientMask"].includes(String(value.contentProtection))
    ? value.contentProtection as BackgroundSettings["contentProtection"]
    : defaultBackgroundSettings.contentProtection;

  return {
    mode,
    preset,
    color: isHexColor(value.color) ? value.color.trim() : undefined,
    imageDataUrl: typeof value.imageDataUrl === "string" && value.imageDataUrl.startsWith("data:image/") ? value.imageDataUrl : undefined,
    imageUrl: isHttpsUrl(value.imageUrl) ? value.imageUrl.trim() : undefined,
    cloudImageUrl: isHttpsUrl(value.cloudImageUrl) ? value.cloudImageUrl.trim() : undefined,
    cloudImagePath: typeof value.cloudImagePath === "string" ? value.cloudImagePath.trim() : undefined,
    imageFit,
    imagePosition,
    focalPoint: normalizeFocalPoint(value.focalPoint),
    overlay,
    blur: typeof value.blur === "boolean" ? value.blur : defaultBackgroundSettings.blur,
    blurAmount: clampNumber(value.blurAmount, 0, 20, defaultBackgroundSettings.blurAmount || 0),
    portraitEnhance: typeof value.portraitEnhance === "boolean" ? value.portraitEnhance : defaultBackgroundSettings.portraitEnhance,
    dim: clampNumber(value.dim, 0, 80, defaultBackgroundSettings.dim || 20),
    scale: clampNumber(value.scale, 90, 130, defaultBackgroundSettings.scale || 100),
    contentProtection,
    photoVisibility: clampNumber(value.photoVisibility, 20, 100, defaultBackgroundSettings.photoVisibility || 80)
  };
}

function readStoredAppBackground(): BackgroundSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("bristol-care-data-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { backgroundSettings?: unknown };
    return normalizeBackgroundSettings(parsed.backgroundSettings);
  } catch {
    return null;
  }
}

export function getBackgroundSettings(): BackgroundSettings {
  if (typeof window === "undefined") return { ...DEFAULT_BACKGROUND_SETTINGS };
  try {
    const raw = window.localStorage.getItem(BACKGROUND_SETTINGS_KEY);
    if (raw) return normalizeBackgroundSettings(JSON.parse(raw));
  } catch {
    try {
      window.localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
    } catch {}
  }
  return readStoredAppBackground() || { ...DEFAULT_BACKGROUND_SETTINGS };
}

export function saveBackgroundSettings(settings: BackgroundSettings): BackgroundSettings {
  const normalized = normalizeBackgroundSettings(settings);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BACKGROUND_SETTINGS_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(BACKGROUND_SETTINGS_CHANGED_EVENT, { detail: normalized }));
    } catch {
      try {
        window.localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
        window.localStorage.setItem(BACKGROUND_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_BACKGROUND_SETTINGS }));
      } catch {}
      window.dispatchEvent(new CustomEvent(BACKGROUND_SETTINGS_CHANGED_EVENT, { detail: { ...DEFAULT_BACKGROUND_SETTINGS } }));
      return { ...DEFAULT_BACKGROUND_SETTINGS };
    }
  }
  return normalized;
}

export function sanitizeBackgroundSettingsForCloud(settings: BackgroundSettings): BackgroundSettings {
  const normalized = normalizeBackgroundSettings(settings);
  return {
    ...normalized,
    imageDataUrl: undefined,
    mode: normalized.mode === "image" ? "preset" : normalized.mode
  };
}

function getImageBackgroundSize(settings: BackgroundSettings): string {
  if (settings.imageFit === "contain" || settings.imageFit === "fullPhoto") return "contain";
  return "cover";
}

function getImageBackgroundPosition(settings: BackgroundSettings): string {
  if (settings.focalPoint) return `${settings.focalPoint.x}% ${settings.focalPoint.y}%`;
  const positions: Record<string, string> = {
    center: "50% 50%",
    top:    "50% 22%",
    bottom: "50% 82%",
    left:   "22% 50%",
    right:  "78% 50%"
  };
  return positions[settings.imagePosition || "center"];
}

export function getBackgroundStyle(settings: BackgroundSettings): CSSProperties {
  const normalized = normalizeBackgroundSettings(settings);
  if (normalized.mode === "color" && normalized.color) {
    return { background: normalized.color };
  }
  if (normalized.mode === "image" && normalized.imageDataUrl) {
    return {
      backgroundImage: `url("${normalized.imageDataUrl}")`,
      backgroundSize: getImageBackgroundSize(normalized),
      backgroundPosition: getImageBackgroundPosition(normalized),
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed"
    };
  }
  if (normalized.mode === "url" && normalized.imageUrl) {
    return {
      backgroundImage: `url("${normalized.imageUrl}")`,
      backgroundSize: getImageBackgroundSize(normalized),
      backgroundPosition: getImageBackgroundPosition(normalized),
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed"
    };
  }
  if (normalized.mode === "cloudImage" && normalized.cloudImageUrl) {
    return {
      backgroundImage: `url("${normalized.cloudImageUrl}")`,
      backgroundSize: getImageBackgroundSize(normalized),
      backgroundPosition: getImageBackgroundPosition(normalized),
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed"
    };
  }
  return { background: presetBackgrounds[normalized.preset || "cream"] };
}

export function getBackgroundOverlayStyle(settings: BackgroundSettings): CSSProperties {
  const normalized = normalizeBackgroundSettings(settings);
  const hasPhotoBackground = normalized.mode === "image" || normalized.mode === "url" || normalized.mode === "cloudImage";

  if (hasPhotoBackground) {
    const minimumDim = ["portrait", "softPortrait"].includes(normalized.imageFit || "") ? 28 : 0;
    const dimValue = Math.max(minimumDim, normalized.dim || 0);
    const opacity = Math.min(0.85, dimValue / 100);
    
    // Content protection overlay
    if (normalized.contentProtection === "strongPanel") {
      return {
        background: `linear-gradient(180deg, rgba(255,250,246,${opacity + 0.15}) 0%, rgba(255,252,250,${opacity + 0.2}) 50%, rgba(255,250,246,${opacity + 0.15}) 100%)`
      };
    }
    if (normalized.contentProtection === "gradientMask") {
      return {
        background: `linear-gradient(180deg, rgba(255,250,246,${opacity + 0.2}) 0%, rgba(255,250,246,${Math.max(0.3, opacity - 0.1)}) 40%, rgba(255,250,246,${Math.max(0.3, opacity - 0.1)}) 60%, rgba(255,250,246,${opacity + 0.2}) 100%)`
      };
    }
    if (normalized.contentProtection === "softPanel") {
      return {
        background: `linear-gradient(180deg, rgba(255,250,246,${opacity}) 0%, rgba(255,252,250,${opacity + 0.05}) 50%, rgba(255,250,246,${opacity}) 100%)`
      };
    }
    return {
      background: `linear-gradient(180deg, rgba(255,250,246,${opacity}) 0%, rgba(255,250,246,${Math.min(0.9, opacity + 0.08)}) 100%)`
    };
  }

  const overlay = normalized.preset === "dark" && normalized.overlay !== "none"
    ? "rgba(18, 18, 24, 0.36)"
    : overlayBackgrounds[normalized.overlay || "light"];
  return { background: overlay };
}

export function isDarkBackground(settings: BackgroundSettings) {
  const normalized = normalizeBackgroundSettings(settings);
  return normalized.mode === "preset" && normalized.preset === "dark";
}