"use client";

import { useEffect, useState } from "react";
import type { WeatherCareState } from "@/components/WeatherCareCard";

export interface HomeTimeHintProps {
  weather?: WeatherCareState;
}

function isBeijingLocation(weather: WeatherCareState): boolean {
  // 1. Timezone check
  if (weather.localTimeZone === "Asia/Shanghai") {
    // If we have city info, confirm it's Beijing
    const city = weather.weather?.cityName?.toLowerCase() || "";
    if (city && (city.includes("beijing") || city.includes("北京"))) {
      return true;
    }
    // Without specific city info but with Asia/Shanghai tz, assume in China
    // but still show both times since it might not be Beijing specifically.
    // Only return true if city explicitly says Beijing.
    if (!city || city === "bristol, uk") {
      return false; // fallback - don't assume Beijing
    }
  }

  // 2. City name check
  const city = weather.weather?.cityName || "";
  if (city.includes("Beijing") || city.includes("北京")) {
    return true;
  }

  return false;
}

/**
 * Format a time string for a given timezone.
 * Returns empty string if formatting fails.
 */
function formatTZTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(new Date());
  } catch {
    return "";
  }
}

/**
 * HomeTimeHint — lightweight time hint for partner homepage Hero.
 *
 * Shows:
 * - If in Beijing: "北京时间 14:30"
 * - If outside Beijing: "你那边 14:30 · 北京 02:30"
 *
 * Avoids hydration mismatch by using client-side rendering only.
 */
export function HomeTimeHint({ weather }: HomeTimeHintProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !weather) {
    // SSR / loading fallback: show nothing until mounted
    return <div className="mt-1.5 h-4" aria-hidden="true" />;
  }

  const beijingTime = formatTZTime("Asia/Shanghai");
  if (!beijingTime) return null;

  const inBeijing = isBeijingLocation(weather);
  const localTZ = weather.localTimeZone || "Asia/Shanghai";

  if (inBeijing) {
    return (
      <p className="mt-1.5 text-xs leading-5 text-cocoa/50">
        北京时间 {beijingTime}
      </p>
    );
  }

  const localTime = localTZ !== "Asia/Shanghai"
    ? formatTZTime(localTZ)
    : beijingTime;

  if (!localTime) {
    return (
      <p className="mt-1.5 text-xs leading-5 text-cocoa/50">
        北京时间 {beijingTime}
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-xs leading-5 text-cocoa/50">
      你那边 {localTime} · 北京 {beijingTime}
    </p>
  );
}
