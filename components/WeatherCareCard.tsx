"use client";

import { useEffect, useState } from "react";
import { fetchWeather, getVisitorLocation, getVisitorTimeZone, weatherCodeText, DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY_NAME } from "@/lib/weatherClient";
import type { WeatherData, HourlyRain } from "@/lib/weatherClient";
import { formatTimeInZone } from "@/lib/timeZones";

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

// ── 降雨预测 ──

export type RainPrediction = {
  /** -1 表示无雨，0 表示当前小时已有雨，>0 表示 N 小时后有雨 */
  hoursUntil: number;
  /** 该小时降雨概率 */
  prob: number;
  /** 该小时降雨/降水量 mm */
  amount: number;
  /** 雨势描述 */
  intensity: string;
};

/**
 * 从未来 12 小时数据中找到最近一次明显降雨。
 *
 * 明显降雨判定：
 *   precipitation_probability >= 40 或 rain/precipitation >= 0.2mm
 *
 * 遍历 hourlyFull（已含 12 小时），找到第一个符合条件的。
 */
export function findNextRain(hourly: HourlyRain[]): RainPrediction | null {
  if (!hourly || hourly.length === 0) return null;

  for (let i = 0; i < hourly.length; i++) {
    const h = hourly[i];
    const prob = h.prob ?? 0;
    const rain = h.rain ?? h.precipitation ?? 0;

    if (prob >= 40 || rain >= 0.2) {
      return {
        hoursUntil: i,
        prob,
        amount: rain,
        intensity: getRainIntensity(rain)
      };
    }
  }

  return null;
}

/**
 * 雨势描述。
 *   < 0.5mm：零星小雨
 *   0.5-2mm：小雨
 *   2-6mm：中雨
 *   > 6mm：雨势较大
 */
export function getRainIntensity(amount: number): string {
  if (amount < 0.5) return "零星小雨";
  if (amount < 2) return "小雨";
  if (amount < 6) return "中雨";
  return "雨势较大";
}

// ── 穿衣建议 ──

/**
 * 穿衣建议。
 *
 * 结合：当前温度、体感温度、风速、是否下雨/雨概率。
 */
export function getClothingAdvice(
  temp: number,
  apparentTemp: number,
  windSpeed: number,
  rainProb: number
): string {
  const parts: string[] = [];

  // 基于实际温度
  if (temp < 5) {
    parts.push("很冷，厚外套和围巾最合适");
  } else if (temp < 12) {
    parts.push("偏冷，外套加内搭刚好");
  } else if (temp < 18) {
    parts.push("微凉，薄外套就可以");
  } else if (temp < 26) {
    parts.push("舒适，轻薄衣物最舒服");
  } else {
    parts.push("炎热，轻薄透气，注意防晒补水");
  }

  // 体感偏冷提示：仅在温度不高于 20°C 且体感比实际低 3°C 以上时提示
  if (temp <= 20 && apparentTemp < temp - 3) {
    const idx = parts[0].endsWith("。") ? parts[0].length - 1 : parts[0].length;
    parts[0] = parts[0].slice(0, idx) + "，体感偏冷";
  }

  // 降雨
  if (rainProb >= 60) {
    parts.push("记得带伞，鞋子选防滑一点");
  } else if (rainProb >= 30) {
    parts.push("可能飘点雨，带把小伞更安心");
  }

  // 大风
  if (windSpeed >= 25) {
    parts.push("风比较大，外套别太薄");
  } else if (windSpeed >= 15 && temp < 15) {
    parts.push("有风，注意防风");
  }

  return parts.join("。") + "。";
}

// ── 时间格式化 ──

/** 把时区转成简短友好名称 */
function friendlyTimeZoneLabel(tz: string): string {
  if (tz === "Asia/Shanghai") return "北京";
  const parts = tz.split("/");
  return parts[parts.length - 1]?.replace(/_/g, " ") || "本地";
}

/** 格式化日落时间为 HH:MM */
function formatSunset(sunsetStr: string, timeZone: string): string {
  try {
    const date = new Date(sunsetStr);
    if (!Number.isFinite(date.getTime())) return "";
    return formatTimeInZone(date, timeZone);
  } catch {
    return "";
  }
}

// ── 卡片组件 ──

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
  const localTimeZone = state.localTimeZone;
  const isBeijingLocal = localTimeZone === "Asia/Shanghai";

  // 基本数据
  const clothing = getClothingAdvice(w.temperature, w.apparentTemperature, w.windSpeed, w.rainProbability);

  // 降雨预测（基于 12 小时 hourlyFull）
  const rainPrediction = w.hourlyFull && w.hourlyFull.length > 0 ? findNextRain(w.hourlyFull) : null;

  // 时间信息
  const now = new Date();
  const localTime = formatTimeInZone(now, localTimeZone);
  const beijingTime = formatTimeInZone(now, "Asia/Shanghai");

  // 日落时间（使用天气数据的时区，Open-Meteo 返回的是当地时区的时间）
  const sunsetDisplay = w.sunset ? formatSunset(w.sunset, localTimeZone) : "";

  // 天气来源标签
  const weatherLabel = state.isFallback ? `Bristol 天气` : w.cityName;

  return (
    <section className="soft-card overflow-hidden bg-gradient-to-br from-white/88 via-skySoft/65 to-lilac/40 px-4 py-3.5">
      {/* ── 第一行：天气描述 + 当前温度 ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-sage/70 mb-0.5">
            {weatherLabel}
          </p>
          <h2 className="text-base font-semibold text-cocoa">
            {weatherCodeText(w.weatherCode)}
          </h2>
        </div>
        <div className="shrink-0 rounded-[1rem] bg-white/65 px-2.5 py-1.5 text-right shadow-sm">
          <p className="text-2xl font-semibold text-cocoa leading-none">{Math.round(w.temperature)}°</p>
        </div>
      </div>

      {/* ── 第二行：体感 / 降雨概率 / 风速 ── */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cocoa/55">
        <span>体感 {Math.round(w.apparentTemperature)}°</span>
        <span className="text-cocoa/25">·</span>
        <span>降雨 {w.rainProbability}%</span>
        <span className="text-cocoa/25">·</span>
        <span>风速 {Math.round(w.windSpeed)} km/h</span>
      </div>

      {/* ── 第三行：穿衣建议 ── */}
      <p className="mt-1.5 text-xs leading-5 text-cocoa/65 break-words">{clothing}</p>

      {/* ── 第四行：降雨提示 ── */}
      {rainPrediction ? (
          <p className="mt-1 text-[11px] leading-5 text-blue-700/80 break-words">
          {rainPrediction.hoursUntil <= 0
            ? "当前时段可能有雨"
            : `约 ${rainPrediction.hoursUntil} 小时后${rainPrediction.intensity}，预计 ${rainPrediction.amount}mm`}
          {rainPrediction.prob > 0 ? `（概率 ${rainPrediction.prob}%）` : ""}
        </p>
      ) : (
        <p className="mt-1 text-[11px] leading-5 text-cocoa/40 break-words">未来几小时无明显降雨</p>
      )}

      {/* ── 第五行：当地时间 · 北京时间 · 日落 ── */}
      <div className="mt-2 flex items-center gap-x-2 text-[11px] text-cocoa/50">
        {isBeijingLocal ? (
          <>
            <span className="font-semibold text-cocoa/70">北京时间</span>
            <span>{beijingTime}</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-cocoa/70">
              {state.isFallback ? "Bristol" : friendlyTimeZoneLabel(localTimeZone)}
            </span>
            <span>{localTime}</span>
            <span className="text-cocoa/25">·</span>
            <span className="font-semibold text-cocoa/70">北京时间</span>
            <span>{beijingTime}</span>
          </>
        )}
        {sunsetDisplay ? (
          <>
            <span className="text-cocoa/25">·</span>
            <span className="text-cocoa/45">日落 {sunsetDisplay}</span>
          </>
        ) : null}
        {state.isFallback && (
          <span className="text-cocoa/35 text-[10px]">· 未获取定位</span>
        )}
      </div>
    </section>
  );
}