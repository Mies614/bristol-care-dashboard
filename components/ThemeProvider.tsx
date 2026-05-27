"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_THEME_SETTINGS,
  getThemeCssVariables,
  getThemeSettings,
  normalizeThemeSettings,
  saveThemeSettings,
  THEME_SETTINGS_CHANGED_EVENT
} from "@/lib/theme";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullCloudData } from "@/lib/cloudSync";
import type { ThemeSettings } from "@/lib/types";

function decorationLabel(decoration: ThemeSettings["decoration"]) {
  if (decoration === "hearts") return "♡";
  if (decoration === "tape") return "▱";
  if (decoration === "moon") return "☾";
  if (decoration === "stars") return "✦";
  return "";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);

  useEffect(() => {
    setSettings(getThemeSettings());
    const onChange = (event: Event) => {
      const custom = event as CustomEvent<ThemeSettings>;
      setSettings(custom.detail ? normalizeThemeSettings(custom.detail) : getThemeSettings());
    };
    window.addEventListener(THEME_SETTINGS_CHANGED_EVENT, onChange);
    if (isCloudConfigured()) {
      const code = getCloudConnection()?.code || getDefaultSpaceCode();
      pullCloudData(code).then((result) => {
        if (result.ok && result.data?.themeSettings) setSettings(saveThemeSettings(result.data.themeSettings));
      }).catch(() => {});
    }
    return () => window.removeEventListener(THEME_SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  const decoration = decorationLabel(settings.decoration);

  return (
    <div
      data-card-style={settings.cardStyle}
      data-decoration={settings.decoration}
      data-nav-style={settings.navStyle}
      data-radius={settings.radius}
      data-theme={settings.style}
      style={getThemeCssVariables(settings)}
    >
      {decoration ? (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[2] mx-auto flex max-w-md justify-between px-8 pt-8 text-2xl text-[var(--app-accent)] opacity-[var(--app-decoration-opacity)] md:max-w-[520px]">
          <span>{decoration}</span>
          <span>{decoration}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
