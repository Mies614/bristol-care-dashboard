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

  return (
    <div className={dark ? "relative isolate min-h-screen text-white" : "relative isolate min-h-screen text-cocoa"}>
      <div className="fixed inset-0 z-0" style={{ ...getBackgroundStyle(safeSettings), filter: safeSettings.blur ? "blur(10px)" : undefined, transform: safeSettings.blur ? "scale(1.04)" : undefined }} />
      <div className="fixed inset-0 z-[1]" style={getBackgroundOverlayStyle(safeSettings)} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
