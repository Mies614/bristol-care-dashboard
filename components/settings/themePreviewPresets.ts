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
  // 1. shadcn/ui soft card
  soft: {
    style: "soft",
    name: "温柔奶油",
    description: "奶油白·玻璃卡·柔和圆角",
    tagline: "shadcn/ui soft card",
    inspiration: "shadcn/ui",
    bgGradient: "linear-gradient(135deg, #fff8f0 0%, #f5e8dc 100%)",
    panelBg: "rgba(255,255,255,0.6)",
    heroBg: "linear-gradient(135deg, rgba(140,106,96,0.18), rgba(140,106,96,0.06))",
    heroAccent: "#8c6a60",
    cardBg: "rgba(255,255,255,0.88)",
    cardBorder: "rgba(255,255,255,0.85)",
    cardRadius: "1.25rem",
    cardShadow: "0 8px 28px rgba(140,106,96,0.12)",
    btnBg: "linear-gradient(135deg, rgba(140,106,96,0.9), rgba(140,106,96,0.7))",
    btnText: "#fff",
    btnRadius: "0.75rem",
    btnShadow: "0 4px 14px rgba(140,106,96,0.25)",
    badgeBg: "rgba(140,106,96,0.15)",
    badgeText: "#8c6a60",
    badgeShape: "pill",
    navBg: "rgba(255,255,255,0.8)",
    navBorder: "rgba(255,255,255,0.7)",
    navItemActive: "rgba(140,106,96,0.2)",
    navItemInactive: "rgba(140,106,96,0.06)",
    navRadius: "0.9rem",
    decorationType: "none",
    decorationColor: "transparent",
  },

  // 2. Magic UI / romantic gradient
  romantic: {
    style: "romantic",
    name: "浪漫粉紫",
    description: "粉紫渐变·爱心点缀·发光按钮",
    tagline: "Magic UI / romantic gradient",
    inspiration: "Magic UI",
    bgGradient: "linear-gradient(135deg, #fef5fa 0%, #fce4f0 50%, #f8d8e8 100%)",
    panelBg: "rgba(255,240,248,0.65)",
    heroBg: "linear-gradient(135deg, #b85f8a 0%, #d485a8 50%, #e8a0c0 100%)",
    heroAccent: "#fff",
    cardBg: "rgba(255,246,251,0.9)",
    cardBorder: "rgba(255,200,225,0.8)",
    cardRadius: "1.5rem",
    cardShadow: "0 8px 32px rgba(184,95,138,0.18)",
    btnBg: "linear-gradient(135deg, #b85f8a, #e080a8)",
    btnText: "#fff",
    btnRadius: "9999px",
    btnShadow: "0 4px 18px rgba(184,95,138,0.4), 0 0 20px rgba(184,95,138,0.15)",
    badgeBg: "#f8d0e0",
    badgeText: "#8a4060",
    badgeShape: "pill",
    navBg: "rgba(255,238,248,0.85)",
    navBorder: "rgba(255,200,225,0.7)",
    navItemActive: "rgba(184,95,138,0.25)",
    navItemInactive: "rgba(184,95,138,0.08)",
    navRadius: "9999px",
    decorationType: "heart",
    decorationColor: "rgba(184,95,138,0.3)",
  },

  // 3. Aceternity UI / elegant card
  elegant: {
    style: "elegant",
    name: "优雅紫韵",
    description: "紫色描边·内发光·细线框",
    tagline: "Aceternity UI / elegant card",
    inspiration: "Aceternity UI",
    bgGradient: "linear-gradient(135deg, #f7f2eb 0%, #f0e8db 100%)",
    panelBg: "rgba(245,238,228,0.5)",
    heroBg: "linear-gradient(135deg, rgba(138,122,106,0.08), rgba(180,160,145,0.04))",
    heroAccent: "#8a7a6a",
    cardBg: "transparent",
    cardBorder: "rgba(138,122,106,0.35)",
    cardRadius: "1.25rem",
    cardShadow: "0 0 0 1px rgba(138,122,106,0.2), 0 0 20px rgba(138,122,106,0.06)",
    btnBg: "transparent",
    btnText: "#8a7a6a",
    btnRadius: "0.5rem",
    btnShadow: "none",
    badgeBg: "rgba(138,122,106,0.1)",
    badgeText: "#6a5a4a",
    badgeShape: "rounded",
    navBg: "transparent",
    navBorder: "rgba(138,122,106,0.2)",
    navItemActive: "rgba(138,122,106,0.12)",
    navItemInactive: "transparent",
    navRadius: "0.5rem",
    decorationType: "border-glow",
    decorationColor: "rgba(138,122,106,0.3)",
  },

  // 4. Linear / clean dashboard
  study: {
    style: "study",
    name: "学习清爽",
    description: "蓝白·清爽·文件夹视感",
    tagline: "Linear / clean dashboard",
    inspiration: "Linear",
    bgGradient: "linear-gradient(135deg, #f0f9f4 0%, #e5f2ea 100%)",
    panelBg: "rgba(245,252,248,0.7)",
    heroBg: "linear-gradient(135deg, #4f7f75 0%, #6a9a8a 100%)",
    heroAccent: "#fff",
    cardBg: "#fff",
    cardBorder: "#e0ece5",
    cardRadius: "0.75rem",
    cardShadow: "0 1px 3px rgba(79,127,117,0.08)",
    btnBg: "#4f7f75",
    btnText: "#fff",
    btnRadius: "0.5rem",
    btnShadow: "none",
    badgeBg: "#e8f5ef",
    badgeText: "#3d6a5e",
    badgeShape: "square",
    navBg: "#fff",
    navBorder: "#e0ece5",
    navItemActive: "#4f7f75",
    navItemInactive: "#a0c0b5",
    navRadius: "0.4rem",
    decorationType: "dot-row",
    decorationColor: "#4f7f75",
  },

  // 5. minimal Tailwind UI
  minimal: {
    style: "minimal",
    name: "极简森林",
    description: "绿色·留白·细分割线",
    tagline: "minimal Tailwind UI",
    inspiration: "Tailwind UI",
    bgGradient: "linear-gradient(135deg, #f8fafc 0%, #eef2f6 100%)",
    panelBg: "rgba(255,255,255,0.5)",
    heroBg: "linear-gradient(135deg, rgba(83,96,106,0.06), rgba(83,96,106,0.02))",
    heroAccent: "#53606a",
    cardBg: "#fff",
    cardBorder: "#e5e7eb",
    cardRadius: "0.5rem",
    cardShadow: "0 1px 2px rgba(0,0,0,0.04)",
    btnBg: "#53606a",
    btnText: "#fff",
    btnRadius: "0.375rem",
    btnShadow: "none",
    badgeBg: "#f1f5f9",
    badgeText: "#475569",
    badgeShape: "dot",
    navBg: "#fff",
    navBorder: "#e5e7eb",
    navItemActive: "#53606a",
    navItemInactive: "#94a3b8",
    navRadius: "0.25rem",
    decorationType: "dot-row",
    decorationColor: "#94a3b8",
  },

  // 6. DaisyUI / sticker card
  playful: {
    style: "playful",
    name: "活泼暖橙",
    description: "暖黄·贴纸·胶带角标",
    tagline: "DaisyUI / sticker card",
    inspiration: "DaisyUI",
    bgGradient: "linear-gradient(135deg, #fff6f0 0%, #ffe8d6 100%)",
    panelBg: "rgba(255,245,238,0.6)",
    heroBg: "linear-gradient(135deg, #e8856e 0%, #f5a890 50%, #fcc8b0 100%)",
    heroAccent: "#fff",
    cardBg: "#fffefc",
    cardBorder: "#ffe0cc",
    cardRadius: "1.25rem",
    cardShadow: "0 6px 20px rgba(232,133,110,0.15), 0 2px 6px rgba(232,133,110,0.08)",
    btnBg: "linear-gradient(135deg, #e8856e, #f0a080)",
    btnText: "#fff",
    btnRadius: "9999px",
    btnShadow: "0 4px 14px rgba(232,133,110,0.35)",
    badgeBg: "#ffe0cc",
    badgeText: "#8a5030",
    badgeShape: "rounded",
    navBg: "rgba(255,248,242,0.9)",
    navBorder: "#ffe0cc",
    navItemActive: "rgba(232,133,110,0.3)",
    navItemInactive: "rgba(232,133,110,0.1)",
    navRadius: "9999px",
    decorationType: "tape",
    decorationColor: "rgba(255,200,150,0.6)",
  },

  // 7. dark shadcn dashboard
  night: {
    style: "night",
    name: "夜间柔和",
    description: "深色毛玻璃·月光蓝·发光 Pill",
    tagline: "dark shadcn dashboard",
    inspiration: "shadcn/ui dark",
    bgGradient: "linear-gradient(135deg, #1f1c28 0%, #2a2634 100%)",
    panelBg: "rgba(30,27,38,0.6)",
    heroBg: "linear-gradient(135deg, rgba(217,194,255,0.2), rgba(120,100,180,0.1))",
    heroAccent: "#d9c2ff",
    cardBg: "rgba(35,31,45,0.8)",
    cardBorder: "rgba(226,214,255,0.15)",
    cardRadius: "1.25rem",
    cardShadow: "0 8px 32px rgba(0,0,0,0.3)",
    btnBg: "linear-gradient(135deg, rgba(217,194,255,0.85), rgba(180,150,230,0.75))",
    btnText: "#2a2634",
    btnRadius: "9999px",
    btnShadow: "0 0 20px rgba(217,194,255,0.35), 0 4px 14px rgba(217,194,255,0.2)",
    badgeBg: "rgba(217,194,255,0.2)",
    badgeText: "#d9c2ff",
    badgeShape: "pill",
    navBg: "rgba(31,28,40,0.85)",
    navBorder: "rgba(226,214,255,0.1)",
    navItemActive: "rgba(217,194,255,0.25)",
    navItemInactive: "rgba(255,255,255,0.08)",
    navRadius: "9999px",
    decorationType: "moon",
    decorationColor: "rgba(217,194,255,0.25)",
  },

  // 8. photo overlay mobile app
  photo: {
    style: "photo",
    name: "照片优先",
    description: "照片背景·半透面板·白色胶囊",
    tagline: "photo overlay mobile app",
    inspiration: "photo overlay",
    bgGradient: "linear-gradient(135deg, #c4b8a8 0%, #d5c8b5 30%, #b8a898 60%, #c8bcac 100%)",
    panelBg: "rgba(255,255,255,0.55)",
    heroBg: "linear-gradient(135deg, rgba(118,95,85,0.3), rgba(160,140,120,0.2))",
    heroAccent: "#fff",
    cardBg: "rgba(255,255,255,0.8)",
    cardBorder: "rgba(255,255,255,0.85)",
    cardRadius: "1.5rem",
    cardShadow: "0 4px 20px rgba(80,60,40,0.12)",
    btnBg: "#fff",
    btnText: "#5f3e30",
    btnRadius: "9999px",
    btnShadow: "0 2px 10px rgba(0,0,0,0.08)",
    badgeBg: "rgba(255,255,255,0.9)",
    badgeText: "#5f3e30",
    badgeShape: "pill",
    navBg: "rgba(255,255,255,0.85)",
    navBorder: "rgba(255,255,255,0.8)",
    navItemActive: "rgba(255,255,255,0.95)",
    navItemInactive: "rgba(255,255,255,0.4)",
    navRadius: "9999px",
    decorationType: "gradient-strip",
    decorationColor: "rgba(255,255,255,0.4)",
  },
};