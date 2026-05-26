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
  portraitEnhance: false,
  dim: 20,
  scale: 100
};

export const DEFAULT_BACKGROUND_SETTINGS = defaultBackgroundSettings;
export const BACKGROUND_SETTINGS_KEY = "bristol_dashboard_background_settings";
export const BACKGROUND_SETTINGS_CHANGED_EVENT = "background-settings-changed";

const presetBackgrounds: Record<NonNullable<BackgroundSettings["preset"]>, string> = {
  cream:
    "radial-gradient(circle at top left, rgba(255,232,226,0.95), transparent 30rem), radial-gradient(circle at 88% 8%, rgba(233,245,255,0.95), transparent 26rem), linear-gradient(180deg, #fff8f0 0%, #fffdf9 46%, #f7fbff 100%)",
  pink:
    "radial-gradient(circle at top left, rgba(255,214,226,0.95), transparent 28rem), radial-gradient(circle at 85% 12%, rgba(255,239,246,0.9), transparent 26rem), linear-gradient(180deg, #fff5f8 0%, #fffafb 52%, #fff7f0 100%)",
  lavender:
    "radial-gradient(circle at top left, rgba(231,220,255,0.95), transparent 30rem), radial-gradient(circle at 85% 12%, rgba(235,245,255,0.9), transparent 28rem), linear-gradient(180deg, #fbf8ff 0%, #fffdfb 52%, #f4f0ff 100%)",
  blue:
    "radial-gradient(circle at top left, rgba(217,239,255,0.95), transparent 30rem), radial-gradient(circle at 85% 10%, rgba(246,232,255,0.75), transparent 28rem), linear-gradient(180deg, #f3fbff 0%, #fffdf9 52%, #edf7ff 100%)",
  green:
    "radial-gradient(circle at top left, rgba(218,244,230,0.95), transparent 30rem), radial-gradient(circle at 85% 12%, rgba(255,236,218,0.75), transparent 28rem), linear-gradient(180deg, #f6fff8 0%, #fffdf9 52%, #eefbf4 100%)",
  dark:
    "radial-gradient(circle at top left, rgba(110,84,130,0.55), transparent 28rem), radial-gradient(circle at 85% 12%, rgba(72,101,130,0.55), transparent 28rem), linear-gradient(180deg, #26202d 0%, #332a37 52%, #1f2933 100%)"
};

const overlayBackgrounds: Record<NonNullable<BackgroundSettings["overlay"]>, string> = {
  none: "transparent",
  light: "rgba(255, 250, 246, 0.34)",
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
  const mode = ["preset", "color", "image", "url"].includes(String(value.mode))
    ? value.mode as BackgroundSettings["mode"]
    : defaultBackgroundSettings.mode;
  const preset = ["cream", "pink", "lavender", "blue", "green", "dark"].includes(String(value.preset))
    ? value.preset as BackgroundSettings["preset"]
    : defaultBackgroundSettings.preset;
  const imageFit = ["cover", "contain", "portrait", "softPortrait"].includes(String(value.imageFit))
    ? value.imageFit as BackgroundSettings["imageFit"]
    : defaultBackgroundSettings.imageFit;
  const imagePosition = ["center", "top", "bottom", "left", "right"].includes(String(value.imagePosition))
    ? value.imagePosition as BackgroundSettings["imagePosition"]
    : defaultBackgroundSettings.imagePosition;
  const overlay = ["none", "light", "medium", "strong"].includes(String(value.overlay))
    ? value.overlay as BackgroundSettings["overlay"]
    : defaultBackgroundSettings.overlay;

  return {
    mode,
    preset,
    color: isHexColor(value.color) ? value.color.trim() : undefined,
    imageDataUrl: typeof value.imageDataUrl === "string" && value.imageDataUrl.startsWith("data:image/") ? value.imageDataUrl : undefined,
    imageUrl: isHttpsUrl(value.imageUrl) ? value.imageUrl.trim() : undefined,
    imageFit,
    imagePosition,
    focalPoint: normalizeFocalPoint(value.focalPoint),
    overlay,
    blur: typeof value.blur === "boolean" ? value.blur : defaultBackgroundSettings.blur,
    portraitEnhance: typeof value.portraitEnhance === "boolean" ? value.portraitEnhance : defaultBackgroundSettings.portraitEnhance,
    dim: clampNumber(value.dim, 0, 80, defaultBackgroundSettings.dim || 20),
    scale: clampNumber(value.scale, 90, 130, defaultBackgroundSettings.scale || 100)
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
    } catch {
      // Ignore unavailable storage.
    }
  }
  return readStoredAppBackground() || { ...DEFAULT_BACKGROUND_SETTINGS };
}

function dispatchBackgroundChanged(settings: BackgroundSettings) {
  if (typeof window === "undefined") return;
  try {
    const event = typeof CustomEvent === "function"
      ? new CustomEvent(BACKGROUND_SETTINGS_CHANGED_EVENT, { detail: settings })
      : new Event(BACKGROUND_SETTINGS_CHANGED_EVENT);
    window.dispatchEvent(event);
  } catch {
    // Some older webviews can fail event construction; background still falls back on next render.
  }
}

export function saveBackgroundSettings(settings: BackgroundSettings): BackgroundSettings {
  const normalized = normalizeBackgroundSettings(settings);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BACKGROUND_SETTINGS_KEY, JSON.stringify(normalized));
      dispatchBackgroundChanged(normalized);
    } catch {
      const fallback = { ...DEFAULT_BACKGROUND_SETTINGS };
      try {
        window.localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
        window.localStorage.setItem(BACKGROUND_SETTINGS_KEY, JSON.stringify(fallback));
      } catch {
        // Storage can be unavailable in private mode; still keep the page usable.
      }
      dispatchBackgroundChanged(fallback);
      return fallback;
    }
  }
  return normalized;
}

export function mergeBackgroundSettings(partial: Partial<BackgroundSettings>): BackgroundSettings {
  return saveBackgroundSettings({
    ...getBackgroundSettings(),
    ...partial
  });
}

export function sanitizeBackgroundSettingsForCloud(settings: BackgroundSettings): BackgroundSettings {
  const normalized = normalizeBackgroundSettings(settings);
  return {
    ...normalized,
    imageDataUrl: undefined,
    mode: normalized.mode === "image" ? "preset" : normalized.mode
  };
}

function getImageBackgroundSize(settings: BackgroundSettings) {
  if (settings.imageFit === "contain") return "contain";
  return "cover";
}

function getImageBackgroundPosition(settings: BackgroundSettings) {
  if (settings.focalPoint) return `${settings.focalPoint.x}% ${settings.focalPoint.y}%`;
  const positions: Record<NonNullable<BackgroundSettings["imagePosition"]>, string> = {
    center: "50% 50%",
    top: "50% 22%",
    bottom: "50% 82%",
    left: "22% 50%",
    right: "78% 50%"
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
  return { background: presetBackgrounds[normalized.preset || "cream"] };
}

export function getOverlayClass(settings: BackgroundSettings) {
  const normalized = normalizeBackgroundSettings(settings);
  return `background-overlay-${normalized.overlay || "light"}`;
}

export function getBackgroundOverlayStyle(settings: BackgroundSettings): CSSProperties {
  const normalized = normalizeBackgroundSettings(settings);
  const hasPhotoBackground = normalized.mode === "image" || normalized.mode === "url";
  if (hasPhotoBackground) {
    const minimumDim = normalized.imageFit === "softPortrait" || normalized.portraitEnhance ? 36 : 0;
    const opacity = Math.min(0.82, Math.max(minimumDim, normalized.dim || 0) / 100);
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
