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
 * 穿衣建议（具体衣物版）。
 *
 * 规则：
 *   - 基于实际温度推荐具体衣物
 *   - 仅 temp <= 20 且体感比实际低 3°C 以上时追加体感偏冷
 *   - 降雨概率 >= 60%：追加带伞+防滑鞋
 *   - 降雨概率 30-60%：追加带小伞
 *   - 风速 >= 25km/h：追加防风外套提醒
 *   - 高温不下雨不出现体感偏冷
 */
export function getClothingAdvice(
  temp: number,
  apparentTemp: number,
  windSpeed: number,
  rainProb: number
): string {
  const parts: string[] = [];

  // 基础穿衣建议（基于实际温度）
  if (temp < 5) {
    parts.push("厚羽绒服/厚大衣 + 毛衣/卫衣 + 围巾，注意保暖");
  } else if (temp < 12) {
    parts.push("厚外套/大衣 + 卫衣或针织衫，怕冷可加围巾");
  } else if (temp < 18) {
    parts.push("薄外套/风衣/夹克 + 长袖，早晚可加一层");
  } else if (temp < 24) {
    parts.push("长袖衬衫/T恤 + 薄外套，白天可单穿");
  } else if (temp < 30) {
    parts.push("短袖/T恤 + 轻薄长裤或半裙，注意防晒");
  } else {
    parts.push("短袖/背心 + 轻薄裤裙，带水，注意防晒补水");
  }

  // 体感偏冷提示：仅 temp <= 20 且体感比实际低 3°C 以上
  if (temp <= 20 && apparentTemp < temp - 3) {
    parts.push("体感偏冷，外套别太薄");
  }

  // 大风：风速 >= 25km/h
  if (windSpeed >= 25) {
    parts.push("风有点大，外套别太轻");
  }

  // 降雨
  if (rainProb >= 60) {
    parts.push("带伞，鞋子选防滑一点");
  } else if (rainProb >= 30) {
    parts.push("可以带一把小伞");
  }

  return parts.join("，") + "。";
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

export function WeatherCareCard({ state, compact }: { state: WeatherCareState; compact?: boolean }) {
  if (state.loading) {
    return compact ? (
      <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/50 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-16 rounded-full bg-white/50 animate-pulse" />
            <div className="h-2.5 w-28 rounded-full bg-white/40 animate-pulse" />
          </div>
        </div>
      </section>
    ) : (
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
    const label = state.isFallback
      ? "未获取定位 · 以下为 Bristol, UK 天气"
      : "允许定位后可显示本地天气。Bristol 今天也要照顾好自己。";
    return (
      <section className="soft-card bg-gradient-to-br from-white/82 to-skySoft/55">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌤️</span>
          <div>
            <p className="text-sm font-semibold text-cocoa">天气</p>
            <p className="mt-0.5 text-sm leading-5 text-cocoa/60">{label}</p>
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

  // ── compact 模式：天气概要 + 穿衣建议 + 时间 + 日落 ──
  if (compact) {
    const compactLocation = state.isFallback
      ? `${w.cityName || "Bristol"}`
      : `${w.cityName || ""}`;
    const compactWeatherHeader = `${compactLocation} · ${weatherCodeText(w.weatherCode)} ${Math.round(w.temperature)}°`;

    // 体感 + 降雨概率 + 风速
    const compactDetails = `体感 ${Math.round(w.apparentTemperature)}° · 雨 ${w.rainProbability}% · 风 ${Math.round(w.windSpeed)}km/h`;

    // 未来降雨提示
    const rainLine = rainPrediction
      ? (rainPrediction.hoursUntil <= 0
        ? `当前${rainPrediction.intensity}${rainPrediction.prob > 0 ? `（概率 ${rainPrediction.prob}%）` : ""}`
        : `${rainPrediction.hoursUntil} 小时后${rainPrediction.intensity}${rainPrediction.prob > 0 ? `（概率 ${rainPrediction.prob}%）` : ""}`)
      : "未来几小时无明显降雨";

    // 时间行
    const timeLine = isBeijingLocal
      ? `北京时间 ${beijingTime}${sunsetDisplay ? ` · 日落 ${sunsetDisplay}` : ""}`
      : `当地 ${localTime} · 北京 ${beijingTime}${sunsetDisplay ? ` · 日落 ${sunsetDisplay}` : ""}`;

    return (
      <section className="soft-card overflow-hidden bg-gradient-to-br from-white/88 via-skySoft/65 to-lilac/40 px-4 py-3">
        <div className="min-w-0">
          <p className="section-kicker mb-0.5">天气</p>
          <h2 className="text-base font-semibold text-cocoa">{compactWeatherHeader}</h2>
          <p className="mt-0.5 text-sm leading-5 text-cocoa/55">{compactDetails}</p>
          <p className="mt-1 text-sm leading-5 text-cocoa/80 break-words">{clothing}</p>
          <p className="mt-0.5 text-xs leading-5 text-cocoa/45">{rainLine}</p>
          <p className="mt-0.5 text-xs leading-5 text-cocoa/45">{timeLine}</p>
        </div>
      </section>
    );
  }

  // ── 全量模式 ──
  return (
    <section className="soft-card overflow-hidden bg-gradient-to-br from-white/88 via-skySoft/65 to-lilac/40 px-4 py-3.5">
      {/* ── 第一行：天气描述 + 当前温度 ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.1em] text-sage/70 mb-0.5">
            {state.isFallback ? "默认 Bristol 天气" : `本地天气 · ${w.cityName}`}
          </p>
          <h2 className="text-base font-semibold text-cocoa">
            {weatherCodeText(w.weatherCode)}
          </h2>
        </div>
        <div className="shrink-0 rounded-[1rem] bg-white/65 px-2.5 py-1.5 text-right shadow-sm">
          <p className="text-3xl font-semibold text-cocoa leading-none">{Math.round(w.temperature)}°</p>
        </div>
      </div>

      {/* ── 第二行：体感 / 降雨概率 / 风速 ── */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cocoa/60">
        <span>体感 {Math.round(w.apparentTemperature)}°</span>
        <span className="text-cocoa/25">·</span>
        <span>降雨 {w.rainProbability}%</span>
        <span className="text-cocoa/25">·</span>
        <span>风速 {Math.round(w.windSpeed)} km/h</span>
      </div>

      {/* ── 第三行：穿衣建议 ── */}
      <p className="mt-1.5 text-base font-medium leading-relaxed text-cocoa/80 break-words">{clothing}</p>

      {/* ── 第四行：降雨提示 ── */}
      {rainPrediction ? (
          <p className="mt-1 text-sm leading-5 text-blue-700/80 break-words">
          {rainPrediction.hoursUntil <= 0
            ? `快下雨了，当前时段${rainPrediction.intensity}`
            : rainPrediction.hoursUntil === 1
              ? `约 1 小时后${rainPrediction.intensity}`
              : `约 ${rainPrediction.hoursUntil} 小时后${rainPrediction.intensity}，预计 ${rainPrediction.amount}mm`}
          {rainPrediction.prob > 0 ? `（概率 ${rainPrediction.prob}%）` : ""}
        </p>
      ) : (
        <p className="mt-1 text-sm leading-5 text-cocoa/50 break-words">未来几小时无明显降雨</p>
      )}

      {/* ── 第五行：当地时间 · 北京时间 · 日落 ── */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cocoa/50">
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
          <span className="text-cocoa/50 text-sm">· 未获取定位</span>
        )}
      </div>
    </section>
  );
}