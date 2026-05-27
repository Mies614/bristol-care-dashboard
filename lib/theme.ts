import type { CSSProperties } from "react";
import type { AppThemeStyle, ThemeSettings } from "./types";

export const THEME_SETTINGS_KEY = "bristol_dashboard_theme_settings";
export const THEME_SETTINGS_CHANGED_EVENT = "theme-settings-changed";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  style: "soft",
  cardStyle: "glass",
  navStyle: "glass",
  radius: "extra",
  decoration: "stars"
};

const styleDefaults: Record<AppThemeStyle, Pick<ThemeSettings, "cardStyle" | "navStyle" | "radius" | "decoration">> = {
  soft: { cardStyle: "glass", navStyle: "glass", radius: "extra", decoration: "stars" },
  romantic: { cardStyle: "glass", navStyle: "pill", radius: "extra", decoration: "hearts" },
  minimal: { cardStyle: "flat", navStyle: "minimal", radius: "medium", decoration: "none" },
  study: { cardStyle: "solid", navStyle: "glass", radius: "large", decoration: "tape" },
  night: { cardStyle: "glass", navStyle: "glass", radius: "large", decoration: "moon" },
  photo: { cardStyle: "solid", navStyle: "paper", radius: "extra", decoration: "none" }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getThemeDefaultsForStyle(style: AppThemeStyle): ThemeSettings {
  return { style, ...styleDefaults[style] };
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  if (!isRecord(value)) return { ...DEFAULT_THEME_SETTINGS };
  const style = ["soft", "romantic", "minimal", "study", "night", "photo"].includes(String(value.style))
    ? value.style as AppThemeStyle
    : DEFAULT_THEME_SETTINGS.style;
  const defaults = getThemeDefaultsForStyle(style);
  return {
    style,
    cardStyle: ["glass", "solid", "paper", "flat"].includes(String(value.cardStyle)) ? value.cardStyle as ThemeSettings["cardStyle"] : defaults.cardStyle,
    navStyle: ["glass", "pill", "paper", "minimal"].includes(String(value.navStyle)) ? value.navStyle as ThemeSettings["navStyle"] : defaults.navStyle,
    radius: ["medium", "large", "extra"].includes(String(value.radius)) ? value.radius as ThemeSettings["radius"] : defaults.radius,
    decoration: ["none", "stars", "hearts", "tape", "moon"].includes(String(value.decoration)) ? value.decoration as ThemeSettings["decoration"] : defaults.decoration
  };
}

export function getThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") return { ...DEFAULT_THEME_SETTINGS };
  try {
    const raw = window.localStorage.getItem(THEME_SETTINGS_KEY);
    if (raw) return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    try {
      window.localStorage.removeItem(THEME_SETTINGS_KEY);
    } catch {}
  }
  return { ...DEFAULT_THEME_SETTINGS };
}

function dispatchThemeChanged(settings: ThemeSettings) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(THEME_SETTINGS_CHANGED_EVENT, { detail: settings }));
  } catch {
    window.dispatchEvent(new Event(THEME_SETTINGS_CHANGED_EVENT));
  }
}

export function saveThemeSettings(settings: ThemeSettings): ThemeSettings {
  const normalized = normalizeThemeSettings(settings);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(normalized));
    } catch {}
    dispatchThemeChanged(normalized);
  }
  return normalized;
}

export function mergeThemeSettings(partial: Partial<ThemeSettings>): ThemeSettings {
  return saveThemeSettings({ ...getThemeSettings(), ...partial });
}

export function getThemeCssVariables(settings: ThemeSettings): CSSProperties {
  const theme = normalizeThemeSettings(settings);
  const radius = theme.radius === "medium" ? "1.1rem" : theme.radius === "large" ? "1.45rem" : "1.75rem";
  const palettes: Record<AppThemeStyle, Record<string, string>> = {
    soft: { accent: "#8c6a60", soft: "rgba(255,226,219,0.72)", card: "rgba(255,255,255,0.76)", nav: "rgba(255,255,255,0.74)", border: "rgba(255,255,255,0.78)", text: "#5f4b44" },
    romantic: { accent: "#b85f8a", soft: "rgba(247,205,232,0.78)", card: "rgba(255,246,251,0.8)", nav: "rgba(255,238,249,0.84)", border: "rgba(255,214,238,0.82)", text: "#654053" },
    minimal: { accent: "#53606a", soft: "rgba(244,246,248,0.86)", card: "rgba(255,255,255,0.9)", nav: "rgba(255,255,255,0.94)", border: "rgba(222,226,230,0.9)", text: "#334155" },
    study: { accent: "#4f7f75", soft: "rgba(219,241,235,0.78)", card: "rgba(250,255,253,0.84)", nav: "rgba(241,250,247,0.84)", border: "rgba(192,222,213,0.8)", text: "#39564f" },
    night: { accent: "#d9c2ff", soft: "rgba(72,61,92,0.7)", card: "rgba(35,31,45,0.76)", nav: "rgba(31,28,40,0.82)", border: "rgba(226,214,255,0.18)", text: "#f7f1ff" },
    photo: { accent: "#765f55", soft: "rgba(255,250,246,0.88)", card: "rgba(255,255,255,0.88)", nav: "rgba(255,255,255,0.9)", border: "rgba(255,255,255,0.9)", text: "#4f3f39" }
  };
  const p = palettes[theme.style];
  const cardAlpha = theme.cardStyle === "flat" ? "rgba(255,255,255,0.98)" : theme.cardStyle === "solid" || theme.style === "photo" ? p.card : p.card;
  return {
    "--app-accent": p.accent,
    "--app-accent-soft": p.soft,
    "--app-card-bg": cardAlpha,
    "--app-card-border": p.border,
    "--app-text": p.text,
    "--app-muted": theme.style === "night" ? "rgba(247,241,255,0.68)" : "rgba(95,75,68,0.66)",
    "--app-shadow": theme.cardStyle === "flat" ? "0 6px 18px rgba(60,45,40,0.06)" : "0 16px 45px rgba(120,90,80,0.14)",
    "--app-radius": radius,
    "--app-nav-bg": p.nav,
    "--app-nav-active": p.soft,
    "--app-decoration-opacity": theme.decoration === "none" ? "0" : "0.42"
  } as CSSProperties;
}
