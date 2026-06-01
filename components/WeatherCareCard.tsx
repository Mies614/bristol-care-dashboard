"use client";

import { useEffect, useState } from "react";
import { fetchWeather, getVisitorLocation, getVisitorTimeZone, weatherCodeText, DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY_NAME } from "@/lib/weatherClient";
import type { WeatherData, HourlyRain } from "@/lib/weatherClient";
import { formatTimeInZone, getRelativeDayLabel } from "@/lib/timeZones";

export type WeatherCareState = {
  weather?: WeatherData;
  loading: boolean;
  /** 是否使用了 fallback 定位 */
  isFallback: boolean;
  /** 浏览器时区（用户当地时区） */
  localTimeZone: string;
};

export function useWeatherCare(): WeatherCareState {
  const [state, setState] = useState<WeatherCareState>({
    loading: true,
    isFallback: false,
    localTimeZone: "Europe/London"
  });

  useEffect(() => {
    let cancelled = false;

    const timeZone = getVisitorTimeZone();

    (async () => {
      // 1. 尝试获取访问者定位
      const location = await getVisitorLocation();

      if (!cancelled) {
        setState((prev) => ({ ...prev, localTimeZone: timeZone }));
      }

      if (location) {
        // 定位成功：使用访问者坐标获取天气
        const result = await fetchWeather(location.lat, location.lon);
        if (!cancelled) {
          if (result.ok) {
            setState({ weather: result.data, loading: false, isFallback: false, localTimeZone: timeZone });
          } else {
            setState({ loading: false, isFallback: false, localTimeZone: timeZone });
          }
        }
        return;
      }

      // 2. 定位失败：fallback 到 Bristol
      const fallbackResult = await fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY_NAME);
      if (!cancelled) {
        if (fallbackResult.ok) {
          setState({ weather: fallbackResult.data, loading: false, isFallback: true, localTimeZone: timeZone });
        } else {
          setState({ loading: false, isFallback: true, localTimeZone: timeZone });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * 穿衣建议。
 */
export function getOutfitText(temp: number, rainProb: number, windSpeed: number): string {
  const parts: string[] = [];

  if (temp < 5) {
    parts.push("很冷，厚外套和围巾最合适。");
  } else if (temp < 12) {
    parts.push("偏冷，外套加内搭刚好。");
  } else if (temp < 20) {
    parts.push("舒适，薄外套就可以。");
  } else if (temp < 28) {
    parts.push("温暖，轻薄衣物舒服。");
  } else {
    parts.push("炎热，记得防晒补水。");
  }

  if (rainProb >= 60) {
    parts.push("记得带伞，今天会下雨。");
  } else if (rainProb >= 30) {
    parts.push("可能飘点雨，带把小伞更安心。");
  }

  if (windSpeed >= 25) {
    parts.push("风比较大，注意防风。");
  }

  return parts.join(" ");
}

/** 把时区转成简短友好名称，如 "本地" "北京" */
function friendlyTimeZoneLabel(tz: string): string {
  if (tz === "Asia/Shanghai") return "北京";
  const parts = tz.split("/");
  return parts[parts.length - 1]?.replace(/_/g, " ") || "本地";
}

export function WeatherCareCard({ state }: { state: WeatherCareState }) {
  if (state.loading) {
    return (
      <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[1.2rem] bg-white/50 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded-full bg-white/50 animate-pulse" />
            <div className="h-3 w-32 rounded-full bg-white/40 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // 天气获取失败
  if (!state.weather) {
    if (state.isFallback) {
      return (
        <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌤️</span>
            <div>
              <p className="text-[13px] font-semibold text-cocoa">天气</p>
              <p className="mt-0.5 text-xs leading-5 text-cocoa/60">
                Bristol 天气暂时看不了，但也要舒舒服服的。
              </p>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌤️</span>
          <div>
            <p className="text-[13px] font-semibold text-cocoa">天气</p>
            <p className="mt-0.5 text-xs leading-5 text-cocoa/60">
              允许定位后可显示本地天气。Bristol 今天也要照顾好自己。
            </p>
          </div>
        </div>
      </section>
    );
  }

  const w = state.weather;
  const outfit = getOutfitText(w.temperature, w.rainProbability, w.windSpeed);
  const now = new Date();

  // 两地时间：访问者当地时区 + 北京时间
  const localTimeZone = state.localTimeZone;
  const localTime = formatTimeInZone(now, localTimeZone);
  const localDayLabel = getRelativeDayLabel(now, now, localTimeZone);
  const beijingTime = formatTimeInZone(now, "Asia/Shanghai");
  const beijingDayLabel = getRelativeDayLabel(now, now, "Asia/Shanghai");

  // 天气来源标签
  const weatherLabel = state.isFallback ? "默认 Bristol 天气" : `本地天气 · ${w.cityName}`;
  const kickerText = state.isFallback ? `未获取定位 · 以下为 ${w.cityName} 天气` : `${w.cityName}`;

  function renderHourlyRain(hourly: HourlyRain[]) {
    const relevant = hourly.filter((h) => h.prob > 0).slice(0, 4);
    if (relevant.length === 0) return null;
    return (
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
        {relevant.map((h) => {
          const showRain = h.prob >= 30;
          return (
            <div
              key={h.hour}
              className={`shrink-0 rounded-[0.85rem] px-2 py-1 text-center text-[10px] leading-tight ${
                showRain ? "bg-blue-100/70 text-blue-700" : "bg-white/50 text-cocoa/55"
              }`}
            >
              <p className="font-semibold">{h.hour}</p>
              <p>{h.prob}%</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="soft-card overflow-hidden bg-gradient-to-br from-white/88 via-skySoft/65 to-lilac/40">
      {/* 顶部：天气主信息 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-kicker mb-1">{weatherLabel}</p>
          <h2 className="text-sm font-semibold text-cocoa">
            {weatherCodeText(w.weatherCode)}
          </h2>
          <p className="mt-1 text-xs leading-5 text-cocoa/60">{outfit}</p>
          {state.isFallback && (
            <p className="mt-0.5 text-[10px] text-cocoa/40">{kickerText}</p>
          )}
        </div>
        <div className="shrink-0 rounded-[1.25rem] bg-white/70 px-3 py-2 text-right shadow-sm">
          <p className="text-2xl font-semibold text-cocoa leading-none">{Math.round(w.temperature)}°</p>
          <p className="mt-0.5 text-[10px] text-cocoa/50">
            体感 {Math.round(w.apparentTemperature)}° · 雨 {w.rainProbability}%
          </p>
        </div>
      </div>

      {/* 未来几小时降雨 */}
      {w.hourlyRain && w.hourlyRain.length > 0 ? renderHourlyRain(w.hourlyRain) : null}

      {/* 三列天气数据 */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-2xl border border-white/70 bg-white/55 px-2.5 py-2 shadow-sm">
          <p className="text-cocoa/45">最高/最低</p>
          <p className="font-semibold text-cocoa">{Math.round(w.maxTemperature)}° / {Math.round(w.minTemperature)}°</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/55 px-2.5 py-2 shadow-sm">
          <p className="text-cocoa/45">风速</p>
          <p className="font-semibold text-cocoa">{Math.round(w.windSpeed)} km/h</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/55 px-2.5 py-2 shadow-sm">
          <p className="text-cocoa/45">日落</p>
          <p className="font-semibold text-cocoa">
            {new Date(w.sunset).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* 两地时间：当地 + 北京 */}
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-[1rem] bg-white/35 p-2">
        <div className="text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-sage">
            {state.isFallback ? "Bristol" : friendlyTimeZoneLabel(localTimeZone)}
          </p>
          <p className="text-lg font-semibold text-cocoa">
            {localDayLabel !== "今天" ? `${localDayLabel} ` : ""}{localTime}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-sage">北京</p>
          <p className="text-lg font-semibold text-cocoa">
            {beijingDayLabel !== "今天" ? `${beijingDayLabel} ` : ""}{beijingTime}
          </p>
        </div>
      </div>
    </section>
  );
}