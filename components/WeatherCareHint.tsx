"use client";

import type { WeatherCareState } from "@/components/WeatherCareCard";
import { getClothingAdvice, findNextRain } from "@/components/WeatherCareCard";

/**
 * WeatherCareHint — lightweight weather reminder strip for partner (/).
 *
 * Sits inside or immediately below the Hero, presenting weather as a gentle
 * caring reminder (not a dashboard card). At most 2–3 lines on 375px viewports.
 *
 * Format (when all data available):
 *   今天 22°C，薄外套就够。紫外线有点强，出门记得防晒。傍晚 19:12 日落，晚些时候可能下雨。
 *
 * Format (basic):
 *   今天 22°C，多云，出门前看一眼天气就好。
 */

function buildWeatherHint(state: WeatherCareState): string {
  if (state.loading) return "";
  const w = state.weather;
  if (!w) return "";

  const temp = Math.round(w.temperature);
  const clothing = getClothingAdvice(w.temperature, w.apparentTemperature, w.windSpeed, w.rainProbability);

  // Strip trailing period from clothing for sentence flow
  const clothingClean = clothing.replace(/[。.]$/, "");

  // Sunset
  let sunsetText = "";
  if (w.sunset) {
    try {
      const d = new Date(w.sunset);
      if (Number.isFinite(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        sunsetText = `傍晚 ${hh}:${mm} 日落`;
      }
    } catch { /* skip */ }
  }

  // Rain prediction
  let rainText = "";
  if (w.hourlyFull && w.hourlyFull.length > 0) {
    const rain = findNextRain(w.hourlyFull);
    if (rain) {
      if (rain.hoursUntil <= 0) {
        rainText = rain.prob >= 50
          ? `现在可能${rain.intensity}`
          : `当前有${rain.intensity}`;
      } else if (rain.hoursUntil <= 2) {
        rainText = `晚些时候可能${rain.intensity}`;
      } else {
        rainText = `晚些时候可能下雨`;
      }
    }
  }

  // Assemble the hint sentence
  const parts: string[] = [];
  parts.push(`今天 ${temp}°C，${clothingClean}`);

  if (sunsetText) {
    parts.push(sunsetText);
  }

  if (rainText) {
    parts.push(rainText);
  }

  const hint = parts.join("。");
  return hint + "。";
}

function getFallbackHint(state: WeatherCareState): string {
  if (state.isFallback) {
    return "天气慢了一点，晚点再帮你看看。";
  }
  return "允许定位后就可以看到本地天气啦。";
}

export function WeatherCareHint({ state }: { state: WeatherCareState }) {
  const hint = buildWeatherHint(state);
  const hasWeather = !!state.weather;

  if (state.loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/50 px-3 py-2">
        <div className="h-2.5 w-32 rounded-full bg-white/50 animate-pulse" />
        <div className="h-2.5 w-20 rounded-full bg-white/40 animate-pulse" />
      </div>
    );
  }

  if (!hasWeather) {
    return (
      <p className="mt-2 text-sm leading-5 text-cocoa/40">
        {getFallbackHint(state)}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-sm leading-relaxed text-cocoa/70">{hint}</p>
    </div>
  );
}
