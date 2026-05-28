"use client";
import type { AppThemeStyle } from "@/lib/types";
import { getThemeDefaultsForStyle } from "@/lib/theme";
import { ThemePreviewCard } from "./ThemePreviewCard";

interface Props {
  currentStyle: AppThemeStyle;
  onSelect: (style: AppThemeStyle) => void;
}

const THEMES: { style: AppThemeStyle; name: string; description: string }[] = [
  { style: "soft", name: "温柔奶油", description: "暖色柔和，适合日常" },
  { style: "romantic", name: "浪漫粉紫", description: "粉紫色调，温柔浪漫" },
  { style: "minimal", name: "极简清爽", description: "干净简洁，专注内容" },
  { style: "study", name: "学习清爽", description: "清新绿色，适合学习" },
  { style: "night", name: "夜间柔和", description: "深色护眼，适合夜间" },
  { style: "photo", name: "照片优先", description: "背景突出，卡片透明" },
  { style: "playful", name: "活泼暖橙", description: "暖橙色系，活泼可爱" },
  { style: "elegant", name: "优雅暖棕", description: "温柔米棕，典雅大方" },
];

export function ThemeStylePicker({ currentStyle, onSelect }: Props) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {THEMES.map(({ style, name, description }) => (
        <ThemePreviewCard
          key={style}
          theme={getThemeDefaultsForStyle(style)}
          selected={currentStyle === style}
          name={name}
          description={description}
          onClick={() => onSelect(style)}
        />
      ))}
    </div>
  );
}