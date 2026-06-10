import type { AppThemeStyle, ThemeNavStyle, ThemeDecoration } from "@/lib/types";

const THEME_ALIAS: Record<string, AppThemeStyle> = {
  // New canonical names
  "warm-letter": "warm-letter",
  "memory-film": "memory-film",
  "soft-aurora": "soft-aurora",
  "clean-dashboard": "clean-dashboard",
  "night-lamp": "night-lamp",
  "garden": "garden",
  // Legacy aliases (backward compat)
  soft: "warm-letter",
  classic: "warm-letter",
  romantic: "warm-letter",
  rose: "warm-letter",
  playful: "warm-letter",
  sunshine: "warm-letter",
  photo: "memory-film",
  moonlight: "memory-film",
  study: "garden",
  forest: "garden",
  minimal: "clean-dashboard",
  elegant: "soft-aurora",
  lavender: "soft-aurora",
  sky: "soft-aurora",
  night: "night-lamp",
  ink: "night-lamp",
};
const NAV_ALIAS: Record<string, ThemeNavStyle> = {
  glass: "glass",
  standard: "glass",
  pill: "pill",
  floating: "floating",
  paper: "paper",
  rounded: "paper",
  minimal: "minimal",
};

export function normalizeThemeStyle(raw: string): AppThemeStyle {
  return THEME_ALIAS[raw] ?? "warm-letter";
}

export function normalizeNavStyle(raw: string): ThemeNavStyle {
  return NAV_ALIAS[raw] ?? "glass";
}

export function getNavContainerClass(navStyle: ThemeNavStyle, themeStyle: AppThemeStyle): string {
  const base = "mx-auto w-full max-w-md pointer-events-auto";
  const themeAccent = themeStyle === "night-lamp" ? " ring-1 ring-white/10" : "";

  switch (navStyle) {
    case "glass":
      return `${base}${themeAccent} rounded-[1.35rem] bg-[var(--app-nav-bg)] backdrop-blur-xl border border-[var(--app-nav-border)] shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-2 py-1.5`;
    case "pill":
      return `${base} rounded-full bg-[var(--app-nav-bg)] backdrop-blur-lg border border-[var(--app-nav-border)] shadow-[0_4px_24px_rgba(0,0,0,0.04)] gap-1 px-3 py-1`;
    case "paper":
      return `${base} rounded-[1.15rem] bg-[var(--app-nav-bg)] border border-[var(--app-nav-border)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-2 py-1.5`;
    case "minimal":
      return `${base} px-2 py-1`;
    case "floating":
      return `${base} rounded-[1.5rem] bg-[var(--app-nav-bg)] backdrop-blur-2xl border border-[var(--app-nav-border)] shadow-[0_8px_40px_rgba(0,0,0,0.08)] px-3 py-1.5`;
    default:
      return `${base} rounded-[1.35rem] bg-[var(--app-nav-bg)] backdrop-blur-xl border border-[var(--app-nav-border)] px-2 py-1.5`;
  }
}

function getItemRadiusClass(navStyle: ThemeNavStyle): string {
  switch (navStyle) {
    case "pill":     return "rounded-full";
    case "floating": return "rounded-[1.25rem]";
    case "glass":    return "rounded-[1.15rem]";
    case "paper":    return "rounded-[1rem]";
    case "minimal":  return "rounded-lg";
    default:         return "rounded-[1.15rem]";
  }
}

export function getNavItemContainerClass(navStyle: ThemeNavStyle, active: boolean): string {
  const radius = getItemRadiusClass(navStyle);
  const base = `flex flex-col items-center justify-center gap-[2px] min-h-11 px-2 py-1.5 transition-all duration-200 ${radius}`;

  if (navStyle === "minimal") {
    if (active) {
      return `${base} bg-[var(--app-accent-soft)]/40`;
    }
    return `${base} hover:bg-white/30`;
  }

  if (active) {
    return `${base} bg-[var(--app-accent-soft)] shadow-sm`;
  }

  return `${base} hover:bg-white/30 active:bg-white/50`;
}

export function getActiveIndicatorClass(themeStyle: AppThemeStyle, navStyle: ThemeNavStyle): string {
  const nav = normalizeNavStyle(navStyle);
  const theme = normalizeThemeStyle(themeStyle);

  if (nav === "minimal") {
    return getMinimalIndicator(theme);
  }

  return "";
}

function getMinimalIndicator(theme: AppThemeStyle): string {
  switch (theme) {
    case "clean-dashboard":
    case "garden":
      return "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-[var(--app-accent)]";
    case "night-lamp":
      return "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-[3px] after:w-2 after:rounded-full after:bg-[var(--app-accent)] after:shadow-[0_0_8px_var(--app-accent)]";
    default:
      return "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-[3px] after:w-6 after:rounded-full after:bg-[var(--app-accent)]";
  }
}

export function getDecorationClass(decoration: ThemeDecoration, active: boolean): string {
  if (!active || decoration === "none") return "";
  switch (decoration) {
    case "hearts": return "after:content-['*'] after:absolute after:-top-0.5 after:right-1/4 after:text-[8px] after:opacity-60 after:text-[var(--app-accent)]";
    case "stars":  return "after:content-['*'] after:absolute after:-top-0.5 after:right-1/4 after:text-[8px] after:opacity-50 after:text-[var(--app-accent)]";
    case "tape":   return "after:content-['|'] after:absolute after:-top-1 after:right-1/4 after:text-[7px] after:opacity-40 after:rotate-12";
    case "moon":   return "after:content-[')'] after:absolute after:-top-0.5 after:right-1/4 after:text-[8px] after:opacity-50 after:text-[var(--app-accent)]";
    case "dots":   return "after:content-['.'] after:absolute after:-top-0.5 after:right-1/4 after:text-[8px] after:opacity-40";
    default:       return "";
  }
}

export function getNavLabelClass(active: boolean, navStyle: ThemeNavStyle): string {
  const base = `text-xs leading-tight font-medium transition-all duration-200 ${navStyle === "minimal" ? "tracking-wide" : ""}`;
  if (active) {
    return `${base} text-[var(--app-accent)] font-semibold`;
  }
  return `${base} text-[var(--app-muted)]`;
}

export function getStatusDotClass(themeStyle: AppThemeStyle): string {
  const theme = normalizeThemeStyle(themeStyle);
  if (theme === "night-lamp") {
    return "w-2 h-2 rounded-full bg-[var(--app-accent)] shadow-[0_0_6px_var(--app-accent)]";
  }
  if (theme === "garden" || theme === "clean-dashboard") {
    return "w-2 h-2 rounded-full bg-green-500";
  }
  return "w-2 h-2 rounded-full bg-[var(--app-accent)]";
}

export function getItemOffsetClass(navStyle: ThemeNavStyle, active: boolean): string {
  if (navStyle === "floating" && active) {
    return "-translate-y-0.5";
  }
  return "";
}