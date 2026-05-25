"use client";

import { useEffect, useState } from "react";
import { BACKGROUND_SETTINGS_KEY, getBackgroundSettings } from "@/lib/background";
import { getCloudConnection } from "@/lib/cloudSync";

type DebugInfo = {
  userAgent: string;
  localStorageAvailable: boolean;
  keys: string[];
  backgroundStatus: string;
  cloudConnectionStatus: string;
  environment: string;
};

function collectDebugInfo(): DebugInfo {
  const info: DebugInfo = {
    userAgent: "unknown",
    localStorageAvailable: false,
    keys: [],
    backgroundStatus: "not checked",
    cloudConnectionStatus: "not checked",
    environment: process.env.NODE_ENV || "unknown"
  };

  if (typeof window === "undefined") return info;
  info.userAgent = window.navigator.userAgent;

  try {
    const testKey = "bristol_dashboard_debug_test";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    info.localStorageAvailable = true;
    info.keys = Object.keys(window.localStorage).filter((key) => key.startsWith("bristol"));
  } catch (error) {
    info.localStorageAvailable = false;
    info.backgroundStatus = error instanceof Error ? error.message : "localStorage unavailable";
    return info;
  }

  try {
    const background = getBackgroundSettings();
    info.backgroundStatus = `${background.mode}${background.mode === "preset" ? `:${background.preset}` : ""}`;
  } catch (error) {
    info.backgroundStatus = error instanceof Error ? error.message : "background parse failed";
  }

  try {
    const connection = getCloudConnection();
    info.cloudConnectionStatus = connection ? `connected:${connection.code}` : "not connected";
  } catch (error) {
    info.cloudConnectionStatus = error instanceof Error ? error.message : "cloud connection parse failed";
  }

  return info;
}

export default function DebugPage() {
  const [info, setInfo] = useState<DebugInfo>({
    userAgent: "loading",
    localStorageAvailable: false,
    keys: [],
    backgroundStatus: "loading",
    cloudConnectionStatus: "loading",
    environment: process.env.NODE_ENV || "unknown"
  });

  useEffect(() => {
    setInfo(collectDebugInfo());
  }, []);

  function clearProjectStorage() {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("bristol_dashboard_") || key.startsWith("bristol-care-")) {
          window.localStorage.removeItem(key);
        }
      }
      window.localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
    } catch {
      // Keep the debug page usable even when storage is blocked.
    }
    setInfo(collectDebugInfo());
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6 text-cocoa">
      <section className="rounded-3xl border border-white/75 bg-white/80 p-5 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-semibold">Bristol Care Debug</h1>
        <div className="mt-5 space-y-3 text-sm leading-6">
          <p><strong>userAgent:</strong> {info.userAgent}</p>
          <p><strong>localStorage:</strong> {info.localStorageAvailable ? "available" : "unavailable"}</p>
          <p><strong>keys:</strong> {info.keys.length ? info.keys.join(", ") : "none"}</p>
          <p><strong>backgroundSettings:</strong> {info.backgroundStatus}</p>
          <p><strong>cloudConnection:</strong> {info.cloudConnectionStatus}</p>
          <p><strong>environment:</strong> {info.environment}</p>
        </div>
        <button className="mt-5 rounded-full bg-[#ffe1dd] px-4 py-2 text-sm font-medium text-[#9f4d45]" onClick={clearProjectStorage}>
          清除本项目 localStorage
        </button>
      </section>
    </main>
  );
}
