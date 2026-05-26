"use client";

import { useEffect, useState } from "react";
import {
  BACKGROUND_SETTINGS_CHANGED_EVENT,
  DEFAULT_BACKGROUND_SETTINGS,
  getBackgroundOverlayStyle,
  getBackgroundSettings,
  getBackgroundStyle,
  isDarkBackground,
  normalizeBackgroundSettings
} from "@/lib/background";
import type { BackgroundSettings } from "@/lib/types";

export function AppBackground({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BACKGROUND_SETTINGS);

  useEffect(() => {
    const refresh = () => {
      try {
        setSettings(getBackgroundSettings());
      } catch {
        setSettings(DEFAULT_BACKGROUND_SETTINGS);
      }
    };
    const onBackgroundChange = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<BackgroundSettings>;
        setSettings(customEvent.detail ? normalizeBackgroundSettings(customEvent.detail) : getBackgroundSettings());
      } catch {
        setSettings(DEFAULT_BACKGROUND_SETTINGS);
      }
    };
    refresh();
    window.addEventListener("bristol-care-data", refresh);
    window.addEventListener(BACKGROUND_SETTINGS_CHANGED_EVENT, onBackgroundChange);
    return () => {
      window.removeEventListener("bristol-care-data", refresh);
      window.removeEventListener(BACKGROUND_SETTINGS_CHANGED_EVENT, onBackgroundChange);
    };
  }, []);

  const safeSettings = normalizeBackgroundSettings(settings);
  const dark = isDarkBackground(safeSettings);
  const hasPhotoBackground = safeSettings.mode === "image" || safeSettings.mode === "url";
  const portraitMode = hasPhotoBackground && (safeSettings.imageFit === "softPortrait" || safeSettings.portraitEnhance);
  const scale = Math.max(safeSettings.blur || safeSettings.imageFit === "softPortrait" ? 105 : 100, safeSettings.scale || 100);
  const backgroundFilter = safeSettings.blur || safeSettings.imageFit === "softPortrait" ? "blur(8px)" : undefined;

  return (
    <div className={`${dark ? "text-white" : "text-cocoa"} ${portraitMode ? "portrait-background" : ""} relative isolate min-h-screen`}>
      <div
        className="fixed inset-0 z-0 will-change-transform"
        style={{
          ...getBackgroundStyle(safeSettings),
          filter: backgroundFilter,
          transform: hasPhotoBackground && scale !== 100 ? `scale(${scale / 100})` : undefined
        }}
      />
      <div className="fixed inset-0 z-[1]" style={getBackgroundOverlayStyle(safeSettings)} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
