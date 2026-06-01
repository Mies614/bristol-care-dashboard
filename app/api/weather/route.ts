/**
 * GET /api/weather?lat=51.45&lon=-2.58
 *
 * 轻量天气 API route，代理 Open-Meteo 免费 API。
 * 不暴露任何密钥到前端，客户端只需传坐标即可。
 * 包含未来 12 小时降雨数据，用于首页降雨预测。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    precipitation_probability_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
    precipitation: number[];
    rain: number[];
    weather_code: number[];
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        { ok: false, error: "缺少坐标参数 lat / lon" },
        { status: 400 }
      );
    }

    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return NextResponse.json(
        { ok: false, error: "坐标参数格式不正确" },
        { status: 400 }
      );
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latNum));
    url.searchParams.set("longitude", String(lonNum));
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max"
    );
    url.searchParams.set(
      "hourly",
      "precipitation_probability,precipitation,rain,weather_code"
    );
    url.searchParams.set("forecast_hours", "12");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `天气服务响应异常 (${response.status})` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as OpenMeteoResponse;

    // 提取 12 小时降雨数据
    const hourlyTimes = data.hourly?.time ?? [];
    const hourlyProb = data.hourly?.precipitation_probability ?? [];
    const hourlyRainVals = data.hourly?.rain ?? [];
    const hourlyPrecipVals = data.hourly?.precipitation ?? [];

    return NextResponse.json({
      ok: true,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      rainProbability: data.daily.precipitation_probability_max[0] ?? 0,
      maxTemperature: data.daily.temperature_2m_max[0],
      minTemperature: data.daily.temperature_2m_min[0],
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0],
      // 12 小时完整数据（客户端做 findNextRain 预测）
      hourlyTime: hourlyTimes,
      hourlyProb,
      hourlyRain: hourlyRainVals,
      hourlyPrecip: hourlyPrecipVals
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "天气服务不可用" },
      { status: 500 }
    );
  }
}