"use client";
import type { AppThemeStyle } from "@/lib/types";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { THEME_PREVIEW_PRESETS } from "./themePreviewPresets";
import { Badge } from "@/components/ui/badge";

interface Props {
  currentStyle: AppThemeStyle;
  onSelect: (style: AppThemeStyle) => void;
  /** Owner-side shows extra labels / hints. */
  showLabels?: boolean;
}

const THEME_ORDER: AppThemeStyle[] = [
  "warm-letter",
  "soft-aurora",
  "clean-dashboard",
  "night-lamp",
];

/** Default theme for partner side. */
const PARTNER_DEFAULT: AppThemeStyle = "warm-letter";
/** Default theme for owner side. */
const OWNER_DEFAULT: AppThemeStyle = "clean-dashboard";

export function ThemeGallery({ currentStyle, onSelect, showLabels = false }: Props) {
  return (
    <div className="space-y-3">
      {showLabels && (
        <div className="flex flex-wrap gap-2 text-xs text-[var(--app-muted)]">
          <span>小乖端默认：<Badge variant="secondary" className="text-[10px]">温暖小纸条</Badge></span>
          <span>我端默认：<Badge variant="secondary" className="text-[10px]">清爽面板</Badge></span>
        </div>
      )}
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {THEME_ORDER.map((style) => {
          const config = THEME_PREVIEW_PRESETS[style];
          if (!config) return null;
          return (
            <div key={style} className="relative">
              <ThemePreviewCard
                config={config}
                selected={currentStyle === style}
                onClick={() => onSelect(style)}
              />
              {(style === PARTNER_DEFAULT || style === OWNER_DEFAULT) && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--app-accent)]/15 px-1.5 py-0.5 text-[9px] font-medium text-[var(--app-accent)]">
                  {style === PARTNER_DEFAULT ? "小乖默认" : "我端默认"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
