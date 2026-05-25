export type BristolWeather = {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  rainProbability: number;
  maxTemperature: number;
  minTemperature: number;
  sunrise: string;
  sunset: string;
};

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
};

export function weatherCodeText(code: number) {
  if (code === 0) return "晴朗";
  if ([1, 2, 3].includes(code)) return "多云";
  if ([45, 48].includes(code)) return "有雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "下雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "下雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气变化中";
}

export async function fetchBristolWeather(): Promise<BristolWeather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", "51.4545");
  url.searchParams.set("longitude", "-2.5879");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max");
  url.searchParams.set("timezone", "Europe/London");

  const response = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!response.ok) throw new Error("Failed to fetch weather");
  const data = (await response.json()) as OpenMeteoResponse;

  return {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    rainProbability: data.daily.precipitation_probability_max[0] ?? 0,
    maxTemperature: data.daily.temperature_2m_max[0],
    minTemperature: data.daily.temperature_2m_min[0],
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0]
  };
}
