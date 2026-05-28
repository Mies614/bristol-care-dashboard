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
  soft:       { cardStyle: "glass",   navStyle: "glass",    radius: "extra",  decoration: "stars" },
  romantic:   { cardStyle: "glass",   navStyle: "pill",     radius: "extra",  decoration: "hearts" },
  minimal:    { cardStyle: "flat",    navStyle: "minimal",  radius: "medium", decoration: "none" },
  study:      { cardStyle: "solid",   navStyle: "glass",    radius: "large",  decoration: "dots" },
  night:      { cardStyle: "glass",   navStyle: "glass",    radius: "large",  decoration: "moon" },
  photo:      { cardStyle: "solid",   navStyle: "paper",    radius: "extra",  decoration: "none" },
  playful:    { cardStyle: "paper",   navStyle: "pill",     radius: "large",  decoration: "tape" },
  elegant:    { cardStyle: "outline", navStyle: "floating", radius: "extra",  decoration: "dots" }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getThemeDefaultsForStyle(style: AppThemeStyle): ThemeSettings {
  return { style, ...styleDefaults[style] };
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  if (!isRecord(value)) return { ...DEFAULT_THEME_SETTINGS };
  const validStyles: AppThemeStyle[] = ["soft","romantic","minimal","study","night","photo","playful","elegant"];
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

/** Get full CSS variable map for a theme */
export function getThemeCssVariables(settings: ThemeSettings): CSSProperties {
  const theme = normalizeThemeSettings(settings);
  const r = theme.radius === "medium" ? "1.1rem" : theme.radius === "large" ? "1.45rem" : "1.75rem";

  // 8 palette definitions
  const palettes: Record<AppThemeStyle, Record<string, string>> = {
    soft: {
      accent: "#8c6a60", soft: "rgba(255,226,219,0.72)", card: "rgba(255,255,255,0.76)",
      nav: "rgba(255,255,255,0.74)", border: "rgba(255,255,255,0.78)", text: "#5f4b44",
      muted: "rgba(95,75,68,0.66)", danger: "#c45a4e", warning: "#b8933a", success: "#5d8a6a",
      bg: "#fff8f0", "bg-soft": "#f5eee7"
    },
    romantic: {
      accent: "#b85f8a", soft: "rgba(247,205,232,0.78)", card: "rgba(255,246,251,0.8)",
      nav: "rgba(255,238,249,0.84)", border: "rgba(255,214,238,0.82)", text: "#654053",
      muted: "rgba(101,64,83,0.66)", danger: "#c44a6a", warning: "#c49a3a", success: "#7a5d8a",
      bg: "#fef5fa", "bg-soft": "#f8ecf3"
    },
    minimal: {
      accent: "#53606a", soft: "rgba(244,246,248,0.86)", card: "rgba(255,255,255,0.9)",
      nav: "rgba(255,255,255,0.94)", border: "rgba(222,226,230,0.9)", text: "#334155",
      muted: "rgba(51,65,85,0.6)", danger: "#dc2626", warning: "#ca8a04", success: "#16a34a",
      bg: "#f8fafc", "bg-soft": "#eef2f6"
    },
    study: {
      accent: "#4f7f75", soft: "rgba(219,241,235,0.78)", card: "rgba(250,255,253,0.84)",
      nav: "rgba(241,250,247,0.84)", border: "rgba(192,222,213,0.8)", text: "#39564f",
      muted: "rgba(57,86,79,0.66)", danger: "#c45a4e", warning: "#b8933a", success: "#3d8a5a",
      bg: "#f0f9f4", "bg-soft": "#e4f0eb"
    },
    night: {
      accent: "#d9c2ff", soft: "rgba(72,61,92,0.7)", card: "rgba(35,31,45,0.76)",
      nav: "rgba(31,28,40,0.82)", border: "rgba(226,214,255,0.18)", text: "#f7f1ff",
      muted: "rgba(247,241,255,0.6)", danger: "#ff8a7a", warning: "#e8c84a", success: "#7ac4a0",
      bg: "#1f1c28", "bg-soft": "#2a2634"
    },
    photo: {
      accent: "#765f55", soft: "rgba(255,250,246,0.88)", card: "rgba(255,255,255,0.88)",
      nav: "rgba(255,255,255,0.9)", border: "rgba(255,255,255,0.9)", text: "#4f3f39",
      muted: "rgba(79,63,57,0.66)", danger: "#c45a4e", warning: "#b8933a", success: "#5d8a6a",
      bg: "#fdf6f0", "bg-soft": "#f5ebe3"
    },
    playful: {
      accent: "#e8856e", soft: "rgba(255,226,215,0.82)", card: "rgba(255,252,250,0.84)",
      nav: "rgba(255,248,244,0.86)", border: "rgba(255,219,206,0.84)", text: "#5a3e35",
      muted: "rgba(90,62,53,0.66)", danger: "#e06050", warning: "#d4a030", success: "#70a080",
      bg: "#fff6f0", "bg-soft": "#f8ece5"
    },
    elegant: {
      accent: "#8a7a6a", soft: "rgba(235,227,218,0.78)", card: "rgba(252,249,245,0.85)",
      nav: "rgba(248,244,238,0.88)", border: "rgba(215,205,192,0.82)", text: "#4a3e35",
      muted: "rgba(74,62,53,0.64)", danger: "#b05a4a", warning: "#a08030", success: "#6a8a6a",
      bg: "#f7f2eb", "bg-soft": "#ede6dd"
    }
  };

  const p = palettes[theme.style];
  const cardStyle = theme.cardStyle;

  // Card bg varies by cardStyle
  let cardBg: string;
  switch (cardStyle) {
    case "glass":   cardBg = theme.style === "night" ? "rgba(35,31,45,0.76)" : "rgba(255,255,255,0.76)"; break;
    case "solid":   cardBg = theme.style === "night" ? "rgba(40,35,50,0.85)" : "rgba(255,255,255,0.9)"; break;
    case "paper":   cardBg = theme.style === "night" ? "rgba(45,40,55,0.82)" : "rgba(252,249,245,0.88)"; break;
    case "flat":    cardBg = theme.style === "night" ? "rgba(50,45,60,0.8)"  : "rgba(255,255,255,0.95)"; break;
    case "outline": cardBg = theme.style === "night" ? "transparent"         : "rgba(255,255,255,0.6)"; break;
    default:        cardBg = p.card;
  }

  const shadowMap: Record<string, string> = {
    glass:  "0 16px 45px rgba(120,90,80,0.14)",
    solid:  "0 10px 30px rgba(60,45,40,0.1)",
    paper:  "0 4px 12px rgba(60,45,40,0.06), 0 1px 3px rgba(60,45,40,0.04)",
    flat:   "0 6px 18px rgba(60,45,40,0.06)",
    outline: "0 2px 8px rgba(60,45,40,0.04)"
  };

  const btnMap = {
    soft:      "linear-gradient(135deg,rgba(140,106,96,0.9),rgba(140,106,96,0.75))",
    romantic:  "linear-gradient(135deg,#b85f8a,#c47a9e)",
    minimal:   "#53606a",
    study:     "linear-gradient(135deg,#4f7f75,#6a9a8a)",
    night:     "linear-gradient(135deg,rgba(217,194,255,0.8),rgba(180,150,230,0.7))",
    photo:     "#765f55",
    playful:   "linear-gradient(135deg,#e8856e,#f0a08a)",
    elegant:   "linear-gradient(135deg,#8a7a6a,#a09080)"
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
    "--app-accent-foreground": theme.style === "night" ? "#2a2634" : "#fff",
    "--app-danger": p.danger,
    "--app-warning": p.warning,
    "--app-success": p.success,
    "--app-radius": r,
    "--app-nav-bg": p.nav,
    "--app-nav-border": theme.style === "night" ? "rgba(226,214,255,0.12)" : "rgba(255,255,255,0.7)",
    "--app-nav-active": p.soft,
    "--app-overlay": "rgba(255,250,246,0.34)",
    "--app-photo-dim": "0",
    "--app-photo-blur": "0",
    "--app-decoration-opacity": theme.decoration === "none" ? "0" : "0.42",
    "--app-btn-bg": btnMap[theme.style],
  } as CSSProperties;
}