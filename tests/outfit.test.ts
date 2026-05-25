import { describe, expect, it } from "vitest";
import { getOutfitSuggestion } from "@/lib/outfit";

describe("outfit suggestion", () => {
  it("suggests warm layers in very low temperature", () => {
    const result = getOutfitSuggestion({
      temperature: 1,
      apparentTemperature: -2,
      rainProbability: 10,
      windSpeed: 8,
      weatherCode: 3
    });

    expect(result.layers).toContain("厚羽绒服");
    expect(result.accessories).toContain("围巾");
    expect(result.accessories).toContain("手套");
  });

  it("adds umbrella and waterproof shoes for heavy rain probability", () => {
    const result = getOutfitSuggestion({
      temperature: 12,
      apparentTemperature: 11,
      rainProbability: 70,
      windSpeed: 10,
      weatherCode: 61
    });

    expect(result.accessories).toContain("雨伞");
    expect(result.accessories).toContain("防水鞋");
    expect(result.warnings.join("")).toContain("下雨概率很高");
  });

  it("warns about strong wind", () => {
    const result = getOutfitSuggestion({
      temperature: 12,
      apparentTemperature: 11,
      rainProbability: 0,
      windSpeed: 32,
      weatherCode: 2
    });

    expect(result.warnings.join("")).toContain("防风");
  });

  it("adds evening class reminder", () => {
    const result = getOutfitSuggestion({
      temperature: 16,
      apparentTemperature: 15,
      rainProbability: 0,
      windSpeed: 8,
      weatherCode: 1,
      hasEveningClass: true
    });

    expect(result.accessories).toContain("备用外套");
    expect(result.warnings.join("")).toContain("晚课");
  });
});
