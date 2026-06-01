/**
 * 天气客户端库
 *
 * 通过 /api/weather 代理请求 Open-Meteo，
 * 不暴露任何密钥到前端。
 *
 * 保留 weather.ts 中的 weatherCodeText 供共享使用。
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
};

/**
 * 天气代码转中文描述。
 * 与 lib/weather.ts 中的 weatherCodeText 保持一致。
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
 * 通过浏览器坐标获取天气数据。
 * 调用后端 /api/weather 代理 Open-Meteo。
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  const response = await fetch(`/api/weather?${params.toString()}`, {
    signal,
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `天气请求失败 (${response.status})`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "天气数据异常");
  }

  return {
    temperature: data.temperature,
    apparentTemperature: data.apparentTemperature,
    weatherCode: data.weatherCode,
    windSpeed: data.windSpeed,
    rainProbability: data.rainProbability,
    maxTemperature: data.maxTemperature,
    minTemperature: data.minTemperature,
    sunrise: data.sunrise,
    sunset: data.sunset,
    hourlyRain: Array.isArray(data.hourlyRain) ? data.hourlyRain : []
  };
}