"use client";

import { useEffect, useState } from "react";
import { fetchWeatherByCoords, weatherCodeText, type WeatherData, type HourlyRain } from "@/lib/weatherClient";
import { getBristolAndBeijingTime } from "@/lib/timeZones";

export type WeatherCareState = {
  weather?: WeatherData;
  loading: boolean;
  locationDenied: boolean;
  /** true 表示已获得定位坐标但天气请求失败 */
  weatherError: boolean;
  /** 显示用的城市名 */
  cityName?: string;
};

export function useWeatherCare(): WeatherCareState {
  const [state, setState] = useState<WeatherCareState>({
    loading: true,
    locationDenied: false,
    weatherError: false
  });

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, loading: false, locationDenied: true }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const weather = await fetchWeatherByCoords(latitude, longitude);
          if (!cancelled) {
            setState({
              weather,
              loading: false,
              locationDenied: false,
              weatherError: false,
              cityName: undefined
            });
          }
        } catch {
          if (!cancelled) {
            setState((prev) => ({ ...prev, loading: false, weatherError: true }));
          }
        }
      },
      () => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, locationDenied: true }));
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 } // 10 min cache
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * 根据温度和降雨给出穿衣建议短文案。
 * 文案温柔，不超过一行半。
 */
export function getOutfitText(temp: number, rainProb: number, windSpeed: number): string {
  const parts: string[] = [];

  // 温度建议
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

  // 降雨补充
  if (rainProb >= 60) {
    parts.push("记得带伞，今天会下雨。");
  } else if (rainProb >= 30) {
    parts.push("可能飘点雨，带把小伞更安心。");
  }

  // 风大补充
  if (windSpeed >= 25) {
    parts.push("风比较大，注意防风。");
  }

  return parts.join(" ");
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

  // 定位被拒绝
  if (state.locationDenied) {
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

  // 天气获取失败
  if (state.weatherError || !state.weather) {
    return (
      <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌤️</span>
          <div>
            <p className="text-[13px] font-semibold text-cocoa">天气</p>
            <p className="mt-0.5 text-xs leading-5 text-cocoa/60">
              今天天气暂时看不了，但也要舒舒服服的。
            </p>
          </div>
        </div>
      </section>
    );
  }

  const w = state.weather;
  const outfit = getOutfitText(w.temperature, w.rainProbability, w.windSpeed);
  const now = new Date();
  const { bristol, beijing } = getBristolAndBeijingTime(now);

  // 未来 6 小时降雨概率内联展示
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
          <p className="section-kicker mb-1">本地天气</p>
          <h2 className="text-sm font-semibold text-cocoa">
            {weatherCodeText(w.weatherCode)}
          </h2>
          <p className="mt-1 text-xs leading-5 text-cocoa/60">{outfit}</p>
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

      {/* 三列天气数据 + 两地时间 */}
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

      {/* 两地时间 */}
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-[1rem] bg-white/35 p-2">
        <div className="text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-sage">{bristol.label}</p>
          <p className="text-lg font-semibold text-cocoa">
            {bristol.dayLabel !== "今天" ? `${bristol.dayLabel} ` : ""}{bristol.time}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-sage">{beijing.label}</p>
          <p className="text-lg font-semibold text-cocoa">
            {beijing.dayLabel !== "今天" ? `${beijing.dayLabel} ` : ""}{beijing.time}
          </p>
        </div>
      </div>
    </section>
  );
}