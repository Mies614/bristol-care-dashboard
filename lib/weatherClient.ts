/**
 * 天气客户端库
 *
 * 通过 /api/weather 代理请求 Open-Meteo，
 * 不暴露任何密钥到前端。
 *
 * 支持浏览器定位 + 反向地理编码获取城市名，
 * 定位失败时 fallback 到 Bristol。
 */

export type HourlyRain = {
  hour: string;
  prob: number;
  rain: number;
};

export type WeatherData = {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  rainProbability: number;
  maxTemperature: number;
  minTemperature: number;
  sunrise: string;
  sunset: string;
  hourlyRain: HourlyRain[];
  /** 反向地理编码获取的城市名，如 "Bristol, UK" */
  cityName: string;
};

export type WeatherResult = { ok: true; data: WeatherData } | { ok: false; error: string };

/** 默认坐标：Bristol, UK */
export const DEFAULT_LAT = 51.4545;
export const DEFAULT_LON = -2.5879;
export const DEFAULT_CITY_NAME = "Bristol, UK";

/**
 * 天气代码转中文描述。
 */
export function weatherCodeText(code: number): string {
  if (code === 0) return "晴朗";
  if ([1, 2, 3].includes(code)) return "多云";
  if ([45, 48].includes(code)) return "有雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "下雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "下雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气变化中";
}

/**
 * 获取访问者位置（浏览器 GPS 定位）。
 * 如果拒绝或失败则返回 null。
 */
export function getVisitorLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
  });
}

/**
 * 从浏览器时区推断城市名（如 "Shanghai"）。
 */
export function getVisitorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch {
    return "Europe/London";
  }
}

/**
 * 根据坐标获取天气数据（用于 hook 调用）。
 * 定位成功时传坐标 + 城市名，定位失败时传默认坐标 + "Bristol, UK"。
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  fallbackCity?: string
): Promise<WeatherResult> {
  try {
    // 尝试反向地理编码获取城市名
    let cityName = fallbackCity || "";
    if (!cityName) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.address) {
            const { city, town, village, county, state, country } = geoData.address;
            cityName = city || town || village || county || state || "";
            if (cityName && country) cityName += `, ${country}`;
          }
        }
      } catch {
        // 反向地理编码失败不阻塞
      }
    }
    if (!cityName) cityName = DEFAULT_CITY_NAME;

    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const response = await fetch(`/api/weather?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: body.error || `天气请求失败 (${response.status})` };
    }

    const data = await response.json();
    if (!data.ok) {
      return { ok: false, error: data.error || "天气数据异常" };
    }

    return {
      ok: true,
      data: {
        temperature: data.temperature,
        apparentTemperature: data.apparentTemperature,
        weatherCode: data.weatherCode,
        windSpeed: data.windSpeed,
        rainProbability: data.rainProbability,
        maxTemperature: data.maxTemperature,
        minTemperature: data.minTemperature,
        sunrise: data.sunrise,
        sunset: data.sunset,
        hourlyRain: Array.isArray(data.hourlyRain) ? data.hourlyRain : [],
        cityName
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "天气加载失败"
    };
  }
}