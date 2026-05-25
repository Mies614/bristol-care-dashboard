"use client";

import { useEffect, useState } from "react";
import { fetchBristolWeather, weatherCodeText, type BristolWeather } from "@/lib/weather";

export function useWeather() {
  const [weather, setWeather] = useState<BristolWeather | undefined>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBristolWeather()
      .then((result) => {
        if (!cancelled) setWeather(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, error };
}

export function WeatherCard({ weather, error }: { weather?: BristolWeather; error?: boolean }) {
  if (error) {
    return (
      <section className="soft-card bg-gradient-to-br from-white/85 to-skySoft/80">
        <p className="section-kicker mb-2">Weather</p>
        <h2 className="font-semibold text-cocoa">Bristol 今日天气</h2>
        <p className="mt-2 text-sm leading-6 text-cocoa/70">天气暂时获取失败，但今天也要照顾好自己。</p>
      </section>
    );
  }

  if (!weather) {
    return (
      <section className="soft-card bg-gradient-to-br from-white/85 to-skySoft/80">
        <p className="section-kicker mb-2">Weather</p>
        <h2 className="font-semibold text-cocoa">Bristol 今日天气</h2>
        <p className="mt-2 text-sm text-cocoa/60">正在看看 Bristol 的天空...</p>
      </section>
    );
  }

  return (
    <section className="soft-card overflow-hidden bg-gradient-to-br from-white/90 via-skySoft/80 to-lilac/55">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-kicker mb-2">Weather</p>
          <h2 className="font-semibold text-cocoa">Bristol 今日天气</h2>
          <p className="mt-1 text-sm text-cocoa/65">{weatherCodeText(weather.weatherCode)}</p>
        </div>
        <div className="rounded-[1.35rem] bg-white/70 px-4 py-3 text-right shadow-sm">
          <div className="text-3xl font-semibold text-cocoa">{Math.round(weather.temperature)}°</div>
          <p className="text-xs text-cocoa/60">体感 {Math.round(weather.apparentTemperature)}°</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-3 shadow-sm">最高 {Math.round(weather.maxTemperature)}° / 最低 {Math.round(weather.minTemperature)}°</div>
        <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-3 shadow-sm">降雨 {weather.rainProbability}%</div>
        <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-3 shadow-sm">风速 {Math.round(weather.windSpeed)} km/h</div>
        <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-3 shadow-sm">
          日落 {new Date(weather.sunset).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </section>
  );
}
