"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BACKGROUND_SETTINGS_CHANGED_EVENT,
  DEFAULT_BACKGROUND_SETTINGS,
  getBackgroundOverlayStyle,
  getBackgroundSettings,
  getBackgroundStyle,
  isDarkBackground,
  normalizeBackgroundSettings,
  saveBackgroundSettings
} from "@/lib/background";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullCloudData } from "@/lib/cloudSync";
import type { BackgroundSettings } from "@/lib/types";

export function AppBackground({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BackgroundSettings>(() => getBackgroundSettings());

  const applySettings = useCallback((next: BackgroundSettings) => {
    const normalized = normalizeBackgroundSettings(next);
    const imageUrl = normalized.mode === "cloudImage" ? normalized.cloudImageUrl : normalized.mode === "url" ? normalized.imageUrl : undefined;
    if (!imageUrl || typeof window === "undefined") {
      setSettings(normalized);
      return;
    }
    const image = new Image();
    image.onload = () => setSettings(normalized);
    image.onerror = () => setSettings({ ...DEFAULT_BACKGROUND_SETTINGS });
    image.src = imageUrl;
  }, []);

  useEffect(() => {
    const refresh = () => {
      try {
        applySettings(getBackgroundSettings());
      } catch {
        setSettings(DEFAULT_BACKGROUND_SETTINGS);
      }
    };
    const onBackgroundChange = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<BackgroundSettings>;
        applySettings(customEvent.detail ? normalizeBackgroundSettings(customEvent.detail) : getBackgroundSettings());
      } catch {
        setSettings(DEFAULT_BACKGROUND_SETTINGS);
      }
    };
    refresh();
    if (isCloudConfigured()) {
      const code = getCloudConnection()?.code || getDefaultSpaceCode();
      pullCloudData(code).then((result) => {
        if (result.ok && result.data?.backgroundSettings) {
          saveBackgroundSettings(result.data.backgroundSettings);
          applySettings(result.data.backgroundSettings);
        }
      }).catch(() => {
        // Local cached background remains active.
      });
    }
    window.addEventListener("bristol-care-data", refresh);
    window.addEventListener(BACKGROUND_SETTINGS_CHANGED_EVENT, onBackgroundChange);
    return () => {
      window.removeEventListener("bristol-care-data", refresh);
      window.removeEventListener(BACKGROUND_SETTINGS_CHANGED_EVENT, onBackgroundChange);
    };
  }, [applySettings]);

  const safeSettings = normalizeBackgroundSettings(settings);
  const dark = isDarkBackground(safeSettings);
  const hasPhotoBackground = safeSettings.mode === "image" || safeSettings.mode === "url" || safeSettings.mode === "cloudImage";
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
