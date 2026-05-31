"use client";
import type { AppThemeStyle } from "@/lib/types";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { THEME_PREVIEW_PRESETS } from "./themePreviewPresets";

interface Props {
  currentStyle: AppThemeStyle;
  onSelect: (style: AppThemeStyle) => void;
}

export function ThemeStylePicker({ currentStyle, onSelect }: Props) {
  const entries = Object.entries(THEME_PREVIEW_PRESETS) as [AppThemeStyle, (typeof THEME_PREVIEW_PRESETS)[AppThemeStyle]][];

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([style, config]) => (
        <ThemePreviewCard
          key={style}
          config={config}
          selected={currentStyle === style}
          onClick={() => onSelect(style)}
        />
      ))}
    </div>
  );
}