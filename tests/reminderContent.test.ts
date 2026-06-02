import { describe, expect, it } from "vitest";
import {
  generateWeatherReminder,
  generateDeadlineReminder,
  generateMissYouReminder,
  generatePeriodReminder,
  generateAllReminders,
} from "@/lib/reminderContent";

describe("generateWeatherReminder", () => {
  it("generates sunny weather reminder", () => {
    const result = generateWeatherReminder({
      weatherCode: 0,
      temperature: 15,
      rainProbability: 10,
      enabled: true,
    });
    expect(result.title).toBe("Bristol 今日天气");
    expect(result.body).toContain("晴朗");
    expect(result.body).toContain("薄外套");
    expect(result.enabled).toBe(true);
    expect(result.tag).toBe("weather-daily");
  });

  it("generates rain warning for high probability", () => {
    const result = generateWeatherReminder({
      weatherCode: 61,
      temperature: 10,
      rainProbability: 85,
      enabled: true,
    });
    expect(result.body).toContain("下雨");
    expect(result.body).toContain("很有可能会下雨");
    expect(result.body).toContain("带伞");
  });

  it("generates cold weather clothing suggestion", () => {
    const result = generateWeatherReminder({
      weatherCode: 1,
      temperature: 3,
      rainProbability: 5,
      enabled: true,
    });
    expect(result.body).toContain("围巾");
    expect(result.body).toContain("厚外套");
  });

  it("generates hot weather suggestion", () => {
    const result = generateWeatherReminder({
      weatherCode: 0,
      temperature: 30,
      rainProbability: 0,
      enabled: true,
    });
    expect(result.body).toContain("透气");
    expect(result.body).toContain("多喝水");
  });

  it("respects enabled flag", () => {
    const result = generateWeatherReminder({
      weatherCode: 0,
      temperature: 20,
      rainProbability: 0,
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});

describe("generateDeadlineReminder", () => {
  it("generates overdue reminder", () => {
    const result = generateDeadlineReminder({
      title: "Essay",
      daysUntilDue: -2,
      enabled: true,
    });
    expect(result.title).toBe("DDL 提醒");
    expect(result.body).toContain("已经过期了");
    expect(result.body).toContain("Essay");
    expect(result.url).toBe("/deadlines");
  });

  it("generates today deadline", () => {
    const result = generateDeadlineReminder({
      title: "Report",
      daysUntilDue: 0,
      enabled: true,
    });
    expect(result.body).toContain("今天截止");
    expect(result.body).toContain("Report");
  });

  it("generates tomorrow deadline", () => {
    const result = generateDeadlineReminder({
      title: "Quiz",
      daysUntilDue: 1,
      enabled: true,
    });
    expect(result.body).toContain("明天截止");
  });

  it("generates near deadline", () => {
    const result = generateDeadlineReminder({
      title: "Homework",
      daysUntilDue: 3,
      enabled: true,
    });
    expect(result.body).toContain("还有 3 天");
    expect(result.body).toContain("拆成小块");
  });

  it("generates distant deadline", () => {
    const result = generateDeadlineReminder({
      title: "Final",
      daysUntilDue: 10,
      enabled: true,
    });
    expect(result.body).toContain("还有 10 天");
    expect(result.body).toContain("提前看看");
  });

  it("respects enabled flag", () => {
    const result = generateDeadlineReminder({
      title: "Essay",
      daysUntilDue: 0,
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});

describe("generateMissYouReminder", () => {
  it("handles no next meet date", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: null,
      enabled: true,
    });
    expect(result.body).toContain("还没有设置下次见面日期");
  });

  it("generates today meet", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: 0,
      enabled: true,
    });
    expect(result.body).toContain("今天");
    expect(result.title).toContain("小乖");
  });

  it("generates tomorrow meet", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: 1,
      enabled: true,
    });
    expect(result.title).toContain("明天");
    expect(result.body).toContain("再过一天");
  });

  it("generates within-week meet", () => {
    const result = generateMissYouReminder({
      nickname: "宝宝",
      daysUntilMeet: 5,
      enabled: true,
    });
    expect(result.title).toContain("宝宝");
    expect(result.body).toContain("很快");
  });

  it("generates distant meet", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: 30,
      enabled: true,
    });
    expect(result.title).toContain("想念 小乖");
    expect(result.body).toContain("30 天");
  });

  it("generates past meet (already met)", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: -1,
      enabled: true,
    });
    expect(result.title).toContain("在一起");
  });

  it("respects enabled flag", () => {
    const result = generateMissYouReminder({
      nickname: "小乖",
      daysUntilMeet: 5,
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});

describe("generatePeriodReminder", () => {
  it("handles insufficient data", () => {
    const result = generatePeriodReminder({
      daysUntilNext: null,
      cycleDay: null,
      enabled: true,
    });
    expect(result.body).toContain("还没有足够的经期数据");
    expect(result.url).toBe("/period");
  });

  it("generates today period start", () => {
    const result = generatePeriodReminder({
      daysUntilNext: 0,
      cycleDay: 1,
      enabled: true,
    });
    expect(result.title).toContain("今天");
    expect(result.body).toContain("对自己温柔");
  });

  it("generates 2 days out period", () => {
    const result = generatePeriodReminder({
      daysUntilNext: 2,
      cycleDay: 26,
      enabled: true,
    });
    expect(result.body).toContain("多留意");
  });

  it("generates 5 days out period", () => {
    const result = generatePeriodReminder({
      daysUntilNext: 5,
      cycleDay: 23,
      enabled: true,
    });
    expect(result.body).toContain("留点余地");
  });

  it("generates distant period", () => {
    const result = generatePeriodReminder({
      daysUntilNext: 15,
      cycleDay: 13,
      enabled: true,
    });
    expect(result.body).toContain("会越来越准");
  });

  it("respects enabled flag", () => {
    const result = generatePeriodReminder({
      daysUntilNext: 2,
      cycleDay: 26,
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});

describe("generateAllReminders", () => {
  const basePrefs = {
    weatherReminder: true,
    deadlineReminder: true,
    missYouReminder: true,
    periodReminder: true,
  };

  it("generates all reminders when all data present", () => {
    const results = generateAllReminders({
      weather: { weatherCode: 0, temperature: 20, rainProbability: 10 },
      deadlines: [{ title: "Essay", daysUntilDue: 2 }],
      missYou: { nickname: "小乖", daysUntilMeet: 5 },
      period: { daysUntilNext: 3, cycleDay: 25 },
      preferences: basePrefs,
    });

    expect(results).toHaveLength(4);
    expect(results[0].tag).toBe("weather-daily");
    expect(results[1].tag).toBe("deadline-reminder");
    expect(results[2].tag).toBe("miss-you-reminder");
    expect(results[3].tag).toBe("period-reminder");
  });

  it("respects disabled preferences", () => {
    const results = generateAllReminders({
      weather: { weatherCode: 0, temperature: 20, rainProbability: 10 },
      deadlines: [{ title: "Essay", daysUntilDue: 2 }],
      missYou: { nickname: "小乖", daysUntilMeet: 5 },
      period: { daysUntilNext: 3, cycleDay: 25 },
      preferences: {
        weatherReminder: false,
        deadlineReminder: true,
        missYouReminder: false,
        periodReminder: true,
      },
    });

    // Only deadline and period
    expect(results).toHaveLength(2);
    expect(results[0].tag).toBe("deadline-reminder");
    expect(results[1].tag).toBe("period-reminder");
  });

  it("skips missing data sections", () => {
    const results = generateAllReminders({
      deadlines: [{ title: "Essay", daysUntilDue: 2 }],
      missYou: { nickname: "小乖", daysUntilMeet: 5 },
      preferences: basePrefs,
    });

    // No weather, no period
    expect(results).toHaveLength(2);
  });

  it("returns empty when all preferences disabled", () => {
    const results = generateAllReminders({
      weather: { weatherCode: 0, temperature: 20, rainProbability: 10 },
      deadlines: [{ title: "Essay", daysUntilDue: 2 }],
      preferences: {
        weatherReminder: false,
        deadlineReminder: false,
        missYouReminder: false,
        periodReminder: false,
      },
    });

    expect(results).toHaveLength(0);
  });
});
