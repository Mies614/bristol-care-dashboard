import type { AppThemeStyle } from "@/lib/types";

export interface ThemePreviewConfig {
  style: AppThemeStyle;
  name: string;
  description: string;
  tagline: string;
  inspiration: string;
  /** Background gradient for the mini preview area */
  bgGradient: string;
  /** Background color used behind cards */
  panelBg: string;
  /** Mini hero area */
  heroBg: string;
  heroAccent: string;
  /** Card style inside preview */
  cardBg: string;
  cardBorder: string;
  cardRadius: string;
  cardShadow: string;
  /** Button inside preview */
  btnBg: string;
  btnText: string;
  btnRadius: string;
  btnShadow: string;
  /** Badge / dot decoration */
  badgeBg: string;
  badgeText: string;
  badgeShape: "pill" | "dot" | "square" | "rounded";
  /** Bottom nav */
  navBg: string;
  navBorder: string;
  navItemActive: string;
  navItemInactive: string;
  navRadius: string;
  /** Decorative element */
  decorationType: "none" | "heart" | "star" | "tape" | "moon" | "dot-row" | "border-glow" | "gradient-strip";
  decorationColor: string;
}

export const THEME_PREVIEW_PRESETS: Record<AppThemeStyle, ThemePreviewConfig> = {
  // 1. warm-letter — 小乖端默认
  "warm-letter": {
    style: "warm-letter",
    name: "温暖小纸条",
    description: "奶油白·玫瑰金·玻璃质感",
    tagline: "小乖端默认主题 — 温暖纸质感",
    inspiration: "手写信",
    bgGradient: "linear-gradient(135deg, #fff8f0 0%, #fce8dc 100%)",
    panelBg: "rgba(255,255,255,0.6)",
    heroBg: "linear-gradient(135deg, rgba(184,112,96,0.22), rgba(184,112,96,0.08))",
    heroAccent: "#b87060",
    cardBg: "rgba(255,255,255,0.88)",
    cardBorder: "rgba(255,240,235,0.82)",
    cardRadius: "1.25rem",
    cardShadow: "0 8px 28px rgba(184,112,96,0.12)",
    btnBg: "linear-gradient(135deg, rgba(184,112,96,0.9), rgba(184,112,96,0.7))",
    btnText: "#fff",
    btnRadius: "0.75rem",
    btnShadow: "0 4px 14px rgba(184,112,96,0.25)",
    badgeBg: "rgba(184,112,96,0.15)",
    badgeText: "#b87060",
    badgeShape: "pill",
    navBg: "rgba(255,255,255,0.80)",
    navBorder: "rgba(255,255,255,0.70)",
    navItemActive: "rgba(184,112,96,0.20)",
    navItemInactive: "rgba(184,112,96,0.06)",
    navRadius: "0.9rem",
    decorationType: "heart",
    decorationColor: "rgba(184,112,96,0.25)",
  },

  // 3. soft-aurora — 梦幻极光
  "soft-aurora": {
    style: "soft-aurora",
    name: "柔光极光",
    description: "薰衣草·淡紫·梦幻渐变",
    tagline: "如梦似幻的极光色彩",
    inspiration: "极光",
    bgGradient: "linear-gradient(135deg, #f8f5ff 0%, #e8dff8 50%, #dce4f8 100%)",
    panelBg: "rgba(250,248,255,0.60)",
    heroBg: "linear-gradient(135deg, rgba(139,127,192,0.18), rgba(160,150,210,0.06))",
    heroAccent: "#8b7fc0",
    cardBg: "rgba(255,255,255,0.84)",
    cardBorder: "rgba(235,225,250,0.82)",
    cardRadius: "1.5rem",
    cardShadow: "0 8px 30px rgba(139,127,192,0.14)",
    btnBg: "linear-gradient(135deg, #8b7fc0, #a090d0)",
    btnText: "#fff",
    btnRadius: "9999px",
    btnShadow: "0 4px 18px rgba(139,127,192,0.35)",
    badgeBg: "rgba(139,127,192,0.15)",
    badgeText: "#6a5fa0",
    badgeShape: "pill",
    navBg: "rgba(250,248,255,0.84)",
    navBorder: "rgba(235,225,250,0.70)",
    navItemActive: "rgba(139,127,192,0.25)",
    navItemInactive: "rgba(139,127,192,0.08)",
    navRadius: "9999px",
    decorationType: "star",
    decorationColor: "rgba(139,127,192,0.30)",
  },

  // 4. clean-dashboard — 我端默认
  "clean-dashboard": {
    style: "clean-dashboard",
    name: "清爽面板",
    description: "纯白·青灰·极简线条",
    tagline: "我端默认主题 — 干净高效",
    inspiration: "Linear / Notion",
    bgGradient: "linear-gradient(135deg, #f8fafc 0%, #eef2f6 100%)",
    panelBg: "rgba(255,255,255,0.55)",
    heroBg: "linear-gradient(135deg, rgba(91,125,138,0.08), rgba(91,125,138,0.03))",
    heroAccent: "#5b7d8a",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    cardRadius: "0.625rem",
    cardShadow: "0 1px 3px rgba(0,0,0,0.06)",
    btnBg: "#5b7d8a",
    btnText: "#fff",
    btnRadius: "0.375rem",
    btnShadow: "none",
    badgeBg: "#f1f5f9",
    badgeText: "#475569",
    badgeShape: "dot",
    navBg: "#ffffff",
    navBorder: "#e2e8f0",
    navItemActive: "#5b7d8a",
    navItemInactive: "#94a3b8",
    navRadius: "0.25rem",
    decorationType: "dot-row",
    decorationColor: "#cbd5e1",
  },

  // 5. night-lamp — 暗夜台灯
  "night-lamp": {
    style: "night-lamp",
    name: "暗夜台灯",
    description: "深蓝·暖金·毛玻璃",
    tagline: "夜晚被窝模式",
    inspiration: "深夜台灯",
    bgGradient: "linear-gradient(135deg, #1a1c2e 0%, #252638 100%)",
    panelBg: "rgba(26,24,36,0.60)",
    heroBg: "linear-gradient(135deg, rgba(232,200,74,0.18), rgba(200,170,60,0.06))",
    heroAccent: "#e8c84a",
    cardBg: "rgba(30,28,42,0.82)",
    cardBorder: "rgba(255,255,255,0.10)",
    cardRadius: "1.25rem",
    cardShadow: "0 8px 32px rgba(0,0,0,0.35)",
    btnBg: "linear-gradient(135deg, rgba(232,200,74,0.85), rgba(200,170,60,0.75))",
    btnText: "#1a1c2e",
    btnRadius: "9999px",
    btnShadow: "0 0 20px rgba(232,200,74,0.30), 0 4px 14px rgba(232,200,74,0.18)",
    badgeBg: "rgba(232,200,74,0.20)",
    badgeText: "#e8c84a",
    badgeShape: "pill",
    navBg: "rgba(26,24,36,0.88)",
    navBorder: "rgba(255,255,255,0.08)",
    navItemActive: "rgba(232,200,74,0.25)",
    navItemInactive: "rgba(255,255,255,0.06)",
    navRadius: "9999px",
    decorationType: "moon",
    decorationColor: "rgba(232,200,74,0.20)",
  },

  // 6. garden — 自然花园
  };
