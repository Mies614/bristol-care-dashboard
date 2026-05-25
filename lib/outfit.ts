export type WeatherForOutfit = {
  temperature: number;
  apparentTemperature: number;
  rainProbability: number;
  windSpeed: number;
  weatherCode: number;
  hasEveningClass?: boolean;
};

export type OutfitSuggestion = {
  title: string;
  summary: string;
  layers: string[];
  accessories: string[];
  warnings: string[];
  emoji: string;
};

export function getOutfitSuggestion(weather: WeatherForOutfit): OutfitSuggestion {
  const feels = weather.apparentTemperature;
  const accessories: string[] = [];
  const warnings: string[] = [];
  let title = "今天穿得舒服一点";
  let emoji = "🌷";
  let layers: string[] = [];

  if (feels <= 0) {
    title = "特别冷，保暖优先";
    emoji = "🧣";
    layers = ["厚羽绒服", "毛衣或卫衣", "保暖内搭", "长裤", "厚袜子"];
    accessories.push("围巾", "手套");
  } else if (feels <= 5) {
    title = "冷冷的一天，要裹暖";
    emoji = "🧥";
    layers = ["羽绒服或厚大衣", "毛衣或厚卫衣", "长裤"];
    accessories.push("围巾");
  } else if (feels <= 10) {
    title = "有点冷，外套要厚实";
    emoji = "🍂";
    layers = ["厚外套或羊毛大衣", "卫衣或针织衫", "长裤"];
  } else if (feels <= 15) {
    title = "清爽偏凉，记得带外套";
    emoji = "🌿";
    layers = ["风衣或薄外套", "卫衣、衬衫或针织衫", "长裤"];
  } else if (feels <= 20) {
    title = "温柔的天气，轻便一点";
    emoji = "🌤️";
    layers = ["薄外套或开衫", "长袖或短袖", "长裤或半裙"];
  } else if (feels <= 25) {
    title = "天气暖和，注意防晒";
    emoji = "☀️";
    layers = ["短袖或薄衬衫", "轻薄裤装或裙装"];
    accessories.push("防晒");
  } else {
    title = "有点热，穿轻薄些";
    emoji = "🧊";
    layers = ["轻薄上衣", "短裤、裙装或轻薄长裤"];
    accessories.push("防晒", "水杯");
  }

  if (weather.rainProbability >= 60) {
    accessories.push("雨伞", "防水鞋");
    warnings.push("今天下雨概率很高，出门前把伞放进包里会安心很多。");
  } else if (weather.rainProbability >= 30) {
    accessories.push("折叠伞");
    warnings.push("可能会有雨，带一把小伞就不怕突然变天。");
  }

  if (weather.windSpeed >= 30) {
    warnings.push("风比较大，外套最好选防风一点的。");
  } else if (weather.windSpeed >= 20) {
    warnings.push("风有点明显，晚上回家可能会冷。");
  }

  if (weather.hasEveningClass) {
    accessories.push("备用外套");
    warnings.push("今天有晚课，多带一件外套，晚上回家路上慢慢走、注意安全。");
  }

  const summary = `体感大约 ${Math.round(feels)}°C，按 Bristol 的天气节奏，今天适合${layers.slice(0, 2).join("加")}。`;

  return {
    title,
    summary,
    layers: Array.from(new Set(layers)),
    accessories: Array.from(new Set(accessories)),
    warnings: Array.from(new Set(warnings)),
    emoji
  };
}
