import { describe, expect, it } from "vitest";
import { getClothingAdvice, getRainIntensity, findNextRain } from "@/components/WeatherCareCard";
import type { HourlyRain } from "@/lib/weatherClient";

describe("getClothingAdvice", () => {
  it("高温 36°C/体感32°C：短袖/轻薄裤裙/防晒补水，不出现体感偏冷", () => {
    const result = getClothingAdvice(36, 32, 10, 10);
    expect(result).toContain("短袖/背心");
    expect(result).toContain("轻薄裤裙");
    expect(result).toContain("防晒补水");
    expect(result).not.toContain("体感偏冷");
  });

  it("12°C-18°C：薄外套/风衣/夹克 + 长袖", () => {
    const result = getClothingAdvice(15, 14, 12, 5);
    expect(result).toContain("薄外套/风衣/夹克");
    expect(result).toContain("长袖");
    expect(result).not.toContain("羽绒服");
    expect(result).not.toContain("短袖");
  });

  it("5°C-12°C：厚外套/大衣 + 卫衣/针织衫", () => {
    const result = getClothingAdvice(8, 5, 10, 10);
    expect(result).toContain("厚外套/大衣");
    expect(result).toContain("卫衣或针织衫");
    expect(result).not.toContain("薄外套");
  });

  it("有雨>=60%：追加带伞/防滑鞋", () => {
    const result = getClothingAdvice(20, 18, 10, 65);
    expect(result).toContain("带伞，鞋子选防滑一点");
  });

  it("有雨30%-60%：追加带小伞", () => {
    const result = getClothingAdvice(20, 18, 10, 45);
    expect(result).toContain("可以带一把小伞");
    expect(result).not.toContain("防滑");
  });

  it("风速>=25km/h：追加防风建议", () => {
    const result = getClothingAdvice(20, 18, 28, 10);
    expect(result).toContain("风有点大，外套别太轻");
  });

  it("体感比实际低4°C且temp<=20：追加体感偏冷", () => {
    const result = getClothingAdvice(10, 5, 10, 10);
    expect(result).toContain("体感偏冷，外套别太薄");
  });

  it("体感比实际低但temp>20：不追加体感偏冷", () => {
    const result = getClothingAdvice(24, 19, 10, 10);
    expect(result).not.toContain("体感偏冷");
  });

  it("24-30°C：短袖/T恤 + 轻薄长裤/半裙", () => {
    const result = getClothingAdvice(27, 28, 8, 5);
    expect(result).toContain("短袖/T恤");
    expect(result).toContain("轻薄长裤或半裙");
    expect(result).toContain("注意防晒");
  });

  it("18-24°C：长袖衬衫/T恤 + 薄外套", () => {
    const result = getClothingAdvice(21, 20, 12, 10);
    expect(result).toContain("长袖衬衫/T恤");
    expect(result).toContain("薄外套");
    expect(result).toContain("白天可单穿");
  });

  it("低于5°C：厚羽绒服/大衣 + 围巾", () => {
    const result = getClothingAdvice(2, -2, 10, 5);
    expect(result).toContain("厚羽绒服/厚大衣");
    expect(result).toContain("围巾");
    expect(result).toContain("注意保暖");
  });
});

describe("getRainIntensity", () => {
  it("returns 零星小雨 for < 0.5mm", () => {
    expect(getRainIntensity(0.3)).toBe("零星小雨");
  });
  it("returns 小雨 for 0.5-2mm", () => {
    expect(getRainIntensity(1)).toBe("小雨");
  });
  it("returns 中雨 for 2-6mm", () => {
    expect(getRainIntensity(4)).toBe("中雨");
  });
  it("returns 雨势较大 for > 6mm", () => {
    expect(getRainIntensity(10)).toBe("雨势较大");
  });
});

describe("findNextRain", () => {
  it("finds rain within next few hours", () => {
    const hourly: HourlyRain[] = [
      { hour: "14:00", prob: 10, rain: 0, precipitation: 0 },
      { hour: "15:00", prob: 20, rain: 0, precipitation: 0 },
      { hour: "16:00", prob: 60, rain: 1.5, precipitation: 1.5 }
    ];
    const result = findNextRain(hourly);
    expect(result).toBeDefined();
    expect(result!.hoursUntil).toBe(2);
    expect(result!.prob).toBe(60);
    expect(result!.intensity).toBe("小雨");
  });

  it("returns null for no significant rain", () => {
    const hourly: HourlyRain[] = [
      { hour: "14:00", prob: 10, rain: 0, precipitation: 0 },
      { hour: "15:00", prob: 15, rain: 0.1, precipitation: 0.1 }
    ];
    expect(findNextRain(hourly)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(findNextRain([])).toBeNull();
  });
});