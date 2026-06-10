import type { CSSProperties } from "react";
import type { AppThemeStyle, ThemeSettings } from "./types";

const THEME_SETTINGS_BASE_KEY = "bristol_dashboard_theme_settings";
const IDENTITY_THEME_PREFIX = "bristol_theme_";
export const THEME_SETTINGS_CHANGED_EVENT = "theme-settings-changed";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  style: "warm-letter",
  cardStyle: "glass",
  navStyle: "glass",
  radius: "extra",
  decoration: "stars"
};

/** Owner-side default theme. */
export const OWNER_DEFAULT_THEME_SETTINGS: ThemeSettings = {
  style: "clean-dashboard",
  cardStyle: "flat",
  navStyle: "minimal",
  radius: "large",
  decoration: "none"
};

const styleDefaults: Record<AppThemeStyle, Pick<ThemeSettings, "cardStyle" | "navStyle" | "radius" | "decoration">> = {
  "warm-letter":     { cardStyle: "glass",   navStyle: "glass",    radius: "extra",  decoration: "stars" },
  "memory-film":     { cardStyle: "paper",   navStyle: "paper",    radius: "large",  decoration: "tape" },
  "soft-aurora":     { cardStyle: "glass",   navStyle: "floating", radius: "extra",  decoration: "stars" },
  "clean-dashboard": { cardStyle: "flat",    navStyle: "minimal",  radius: "large",  decoration: "none" },
  "night-lamp":      { cardStyle: "glass",   navStyle: "glass",    radius: "large",  decoration: "moon" },
  "garden":          { cardStyle: "solid",   navStyle: "paper",    radius: "large",  decoration: "dots" }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getThemeDefaultsForStyle(style: AppThemeStyle): ThemeSettings {
  return { style, ...styleDefaults[style] };
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  if (!isRecord(value)) return { ...DEFAULT_THEME_SETTINGS };
  const validStyles: AppThemeStyle[] = ["warm-letter","memory-film","soft-aurora","clean-dashboard","night-lamp","garden"];
  const style = validStyles.includes(value.style as AppThemeStyle)
    ? value.style as AppThemeStyle
    : DEFAULT_THEME_SETTINGS.style;
  const defaults = getThemeDefaultsForStyle(style);
  const validCard = ["glass","solid","paper","flat","outline"];
  const validNav = ["glass","pill","paper","minimal","floating"];
  const validRadius = ["medium","large","extra"];
  const validDecoration = ["none","stars","hearts","tape","moon","dots"];
  return {
    style,
    cardStyle: validCard.includes(String(value.cardStyle)) ? value.cardStyle as ThemeSettings["cardStyle"] : defaults.cardStyle,
    navStyle: validNav.includes(String(value.navStyle)) ? value.navStyle as ThemeSettings["navStyle"] : defaults.navStyle,
    radius: validRadius.includes(String(value.radius)) ? value.radius as ThemeSettings["radius"] : defaults.radius,
    decoration: validDecoration.includes(String(value.decoration)) ? value.decoration as ThemeSettings["decoration"] : defaults.decoration,
    backgroundTreatment: value.backgroundTreatment === undefined ? undefined
      : ["soft","clearPhoto","blurPhoto","dimPhoto","gradientPhoto"].includes(String(value.backgroundTreatment))
        ? value.backgroundTreatment as ThemeSettings["backgroundTreatment"]
        : undefined
  };
}

/** Resolve the localStorage key for a given identity ("me" or partner id). */
function getIdentityThemeKey(identity: string): string {
  return IDENTITY_THEME_PREFIX + identity;
}

/** Detect current identity from URL pathname. */
function getCurrentIdentity(): string {
  if (typeof window === "undefined") return "";
  try {
    if (window.location.pathname.startsWith("/me")) return "me";
  } catch {}
  return process.env.NEXT_PUBLIC_DEFAULT_NORMAL_IDENTITY_ID || "";
}

export function getThemeSettings(identity?: string): ThemeSettings {
  if (typeof window === "undefined") return { ...DEFAULT_THEME_SETTINGS };
  const id = identity || getCurrentIdentity();
  try {
    // Check identity-specific key first
    if (id) {
      const rawId = window.localStorage.getItem(getIdentityThemeKey(id));
      if (rawId) return normalizeThemeSettings(JSON.parse(rawId));
    }
    // Fall back to legacy key
    const raw = window.localStorage.getItem(THEME_SETTINGS_BASE_KEY);
    if (raw) return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    try {
      window.localStorage.removeItem(THEME_SETTINGS_BASE_KEY);
    } catch {}
  }
  // Return appropriate default based on identity
  if (id === "me") return { ...OWNER_DEFAULT_THEME_SETTINGS };
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

export function saveThemeSettings(settings: ThemeSettings, identity?: string): ThemeSettings {
  const normalized = normalizeThemeSettings(settings);
  if (typeof window !== "undefined") {
    const id = identity || getCurrentIdentity();
    try {
      // Save to identity-specific key
      if (id) {
        window.localStorage.setItem(getIdentityThemeKey(id), JSON.stringify(normalized));
      }
      // Also save to legacy key for backward compatibility
      window.localStorage.setItem(THEME_SETTINGS_BASE_KEY, JSON.stringify(normalized));
    } catch {}
    dispatchThemeChanged(normalized);
  }
  return normalized;
}

export function mergeThemeSettings(partial: Partial<ThemeSettings>, identity?: string): ThemeSettings {
  return saveThemeSettings({ ...getThemeSettings(identity), ...partial }, identity);
}

/** Get full CSS variable map for a theme */
export function getThemeCssVariables(settings: ThemeSettings): CSSProperties {
  const theme = normalizeThemeSettings(settings);
  const r = theme.radius === "medium" ? "1.1rem" : theme.radius === "large" ? "1.45rem" : "1.75rem";

  // 6 distinct visual themes
    // 6 distinct visual themes
  const palettes: Record<AppThemeStyle, Record<string, string>> = {
    // 1. warm-letter — warm cream/blush/rose, paper-like (小乖端默认)
    "warm-letter": {
      accent: "#b87060", soft: "rgba(240,210,200,0.72)", card: "rgba(255,255,255,0.80)",
      nav: "rgba(255,255,255,0.78)", border: "rgba(255,240,235,0.82)", text: "#5a3e35",
      muted: "rgba(90,62,53,0.64)", danger: "#c45a4e", warning: "#b8933a", success: "#5d8a6a",
      bg: "#fff8f0", "bg-soft": "#f5ece3"
    },
    // 2. memory-film — warm amber/sepia, nostalgic photo feel
    "memory-film": {
      accent: "#a07850", soft: "rgba(220,200,180,0.70)", card: "rgba(255,252,248,0.85)",
      nav: "rgba(255,250,245,0.84)", border: "rgba(230,215,200,0.78)", text: "#4a3a2e",
      muted: "rgba(74,58,46,0.64)", danger: "#b05a4a", warning: "#a08030", success: "#6a8a5a",
      bg: "#f5ede0", "bg-soft": "#ebe0d2"
    },
    // 3. soft-aurora — cool lavender/sky/lilac, dreamy
    "soft-aurora": {
      accent: "#8b7fc0", soft: "rgba(220,210,245,0.74)", card: "rgba(255,255,255,0.80)",
      nav: "rgba(250,248,255,0.80)", border: "rgba(235,225,250,0.82)", text: "#4a3e6a",
      muted: "rgba(74,62,106,0.62)", danger: "#c45a6e", warning: "#b8934a", success: "#6a8a6a",
      bg: "#f8f5ff", "bg-soft": "#eee8f8"
    },
    // 4. clean-dashboard — crisp white/sage/indigo (我端默认)
    "clean-dashboard": {
      accent: "#5b7d8a", soft: "rgba(220,235,240,0.70)", card: "rgba(255,255,255,0.92)",
      nav: "rgba(255,255,255,0.94)", border: "rgba(220,228,232,0.85)", text: "#334155",
      muted: "rgba(51,65,85,0.60)", danger: "#dc2626", warning: "#ca8a04", success: "#16a34a",
      bg: "#f8fafc", "bg-soft": "#eef2f6"
    },
    // 5. night-lamp — deep navy/warm amber, cozy dark mode
    "night-lamp": {
      accent: "#e8c84a", soft: "rgba(60,55,75,0.70)", card: "rgba(30,28,42,0.80)",
      nav: "rgba(26,24,36,0.86)", border: "rgba(255,255,255,0.10)", text: "#f0ecff",
      muted: "rgba(240,236,255,0.55)", danger: "#ff8a7a", warning: "#e8c84a", success: "#7ac4a0",
      bg: "#1a1c2e", "bg-soft": "#252638"
    },
    // 6. garden — sage/mint/cream, natural botanical
    "garden": {
      accent: "#6b8a6a", soft: "rgba(210,230,210,0.72)", card: "rgba(252,255,250,0.84)",
      nav: "rgba(248,252,246,0.84)", border: "rgba(210,225,210,0.80)", text: "#3a503a",
      muted: "rgba(58,80,58,0.64)", danger: "#c45a4e", warning: "#b8933a", success: "#4a8a5a",
      bg: "#f2f7f0", "bg-soft": "#e4ede2"
    }
  };
  const p = palettes[theme.style];
  const cardStyle = theme.cardStyle;

  // Card bg varies by cardStyle
  let cardBg: string;
  switch (cardStyle) {
    case "glass":   cardBg = theme.style === "night-lamp" ? "rgba(35,31,45,0.76)" : "rgba(255,255,255,0.76)"; break;
    case "solid":   cardBg = theme.style === "night-lamp" ? "rgba(40,35,50,0.85)" : "rgba(255,255,255,0.9)"; break;
    case "paper":   cardBg = theme.style === "night-lamp" ? "rgba(45,40,55,0.82)" : "rgba(252,249,245,0.88)"; break;
    case "flat":    cardBg = theme.style === "night-lamp" ? "rgba(50,45,60,0.8)"  : "rgba(255,255,255,0.95)"; break;
    case "outline": cardBg = theme.style === "night-lamp" ? "transparent"         : "rgba(255,255,255,0.6)"; break;
    default:        cardBg = p.card;
  }

  const shadowMap: Record<string, string> = {
    glass:  "0 16px 45px rgba(120,90,80,0.14)",
    solid:  "0 10px 30px rgba(60,45,40,0.1)",
    paper:  "0 4px 12px rgba(60,45,40,0.06), 0 1px 3px rgba(60,45,40,0.04)",
    flat:   "0 6px 18px rgba(60,45,40,0.06)",
    outline: "0 2px 8px rgba(60,45,40,0.04)"
  };

  const btnMap: Record<string, string> = {
    "warm-letter":     "linear-gradient(135deg,rgba(184,112,96,0.9),rgba(184,112,96,0.75))",
    "memory-film":     "linear-gradient(135deg,#a07850,#b89060)",
    "soft-aurora":     "linear-gradient(135deg,#8b7fc0,#a090d0)",
    "clean-dashboard": "#5b7d8a",
    "night-lamp":      "linear-gradient(135deg,rgba(232,200,74,0.85),rgba(200,170,60,0.75))",
    "garden":          "linear-gradient(135deg,#6b8a6a,#80a080)"
  };
  return {
    "--app-bg": p.bg,
    "--app-bg-soft": p["bg-soft"],
    "--app-text": p.text,
    "--app-muted": p.muted,
    "--app-card-bg": cardBg,
    "--app-card-border": cardStyle === "outline" ? p.accent + "55" : p.border,
    "--app-card-shadow": shadowMap[cardStyle] || shadowMap.glass,
    "--app-accent": p.accent,
    "--app-accent-soft": p.soft,
    "--app-accent-foreground": theme.style === "night-lamp" ? "#2a2634" : "#fff",
    "--app-danger": p.danger,
    "--app-warning": p.warning,
    "--app-success": p.success,
    "--app-radius": r,
    "--app-nav-bg": p.nav,
    "--app-nav-border": theme.style === "night-lamp" ? "rgba(226,214,255,0.12)" : "rgba(255,255,255,0.7)",
    "--app-nav-active": p.soft,
    "--app-overlay": "rgba(255,250,246,0.34)",
    "--app-photo-dim": "0",
    "--app-photo-blur": "0",
    "--app-decoration-opacity": theme.decoration === "none" ? "0" : "0.42",
    "--app-btn-bg": btnMap[theme.style],
  } as CSSProperties;
}