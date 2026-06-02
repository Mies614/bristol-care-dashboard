/**
 * Reminder content generation.
 * Pure functions that take input data and produce notification payloads.
 * No browser API access, no side effects — fully testable.
 */

export interface ReminderPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  enabled: boolean;
}

/**
 * Generate a weather reminder based on weather code, temperature, and rain probability.
 */
export function generateWeatherReminder(input: {
  weatherCode: number;
  temperature: number;
  rainProbability: number;
  enabled: boolean;
}): ReminderPayload {
  const weather = describeWeather(input.weatherCode);

  let body = `今天 Bristol ${weather}，体感约 ${Math.round(input.temperature)}°C`;

  // Rain warning
  if (input.rainProbability >= 80) {
    body += "，很有可能会下雨，记得带伞";
  } else if (input.rainProbability >= 50) {
    body += "，可能会下雨，带把伞比较安心";
  }

  // Clothing suggestion
  if (input.temperature <= 5) {
    body += "。天冷，围巾和厚外套不要少";
  } else if (input.temperature <= 12) {
    body += "。有点凉，穿件暖和的外套出门";
  } else if (input.temperature <= 18) {
    body += "。温度刚好，薄外套或针织衫都可以";
  } else if (input.temperature >= 28) {
    body += "。天热，穿轻薄透气，记得多喝水";
  }

  body += " ☀️";

  return {
    title: "Bristol 今日天气",
    body,
    tag: "weather-daily",
    url: "/",
    enabled: input.enabled,
  };
}

function describeWeather(code: number): string {
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
 * Generate a deadline reminder for the most urgent deadline.
 */
export function generateDeadlineReminder(input: {
  title: string;
  daysUntilDue: number;
  enabled: boolean;
}): ReminderPayload {
  const { title, daysUntilDue } = input;
  let body: string;

  if (daysUntilDue < 0) {
    body = `「${title}」已经过期了。不要慌，翻出来看一眼，做一点算一点。`;
  } else if (daysUntilDue === 0) {
    body = `「${title}」今天截止。先搞定最重要的部分，加油。`;
  } else if (daysUntilDue === 1) {
    body = `「${title}」明天截止，今天可以收个尾。`;
  } else if (daysUntilDue <= 3) {
    body = `「${title}」还有 ${daysUntilDue} 天截止，可以拆成小块慢慢来。`;
  } else {
    body = `「${title}」还有 ${daysUntilDue} 天，提前看看会轻松很多。`;
  }

  return {
    title: daysUntilDue <= 0 ? "DDL 提醒" : "Deadline 临近提醒",
    body,
    tag: `deadline-reminder`,
    url: "/deadlines",
    enabled: input.enabled,
  };
}

/**
 * Generate a miss-you countdown reminder.
 */
export function generateMissYouReminder(input: {
  nickname: string;
  daysUntilMeet: number | null;
  enabled: boolean;
}): ReminderPayload {
  const name = input.nickname || "小乖";

  if (input.daysUntilMeet === null) {
    return {
      title: `想念 ${name}`,
      body: "还没有设置下次见面日期，去设置一下吧。",
      tag: "miss-you-reminder",
      url: "/settings",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilMeet < 0) {
    return {
      title: `今天和 ${name} 在一起`,
      body: "这一天已经到来，好好享受见面的时间 💕",
      tag: "miss-you-reminder",
      url: "/",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilMeet === 0) {
    return {
      title: `今天就能见到 ${name} 了`,
      body: "今天终于可以见面了，真开心。",
      tag: "miss-you-reminder",
      url: "/",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilMeet === 1) {
    return {
      title: `明天就能见到 ${name} 了`,
      body: "再过一天就可以见面了 💫",
      tag: "miss-you-reminder",
      url: "/",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilMeet <= 7) {
    return {
      title: `还有 ${input.daysUntilMeet} 天就能见到 ${name}`,
      body: "很快就能见面了，这一周过得真快。",
      tag: "miss-you-reminder",
      url: "/",
      enabled: input.enabled,
    };
  }

  return {
    title: `想念 ${name}`,
    body: `还有 ${input.daysUntilMeet} 天见面，每一天都值得期待。`,
    tag: "miss-you-reminder",
    url: "/",
    enabled: input.enabled,
  };
}

/**
 * Generate a period reminder based on cycle prediction.
 */
export function generatePeriodReminder(input: {
  daysUntilNext: number | null;
  cycleDay: number | null;
  enabled: boolean;
}): ReminderPayload {
  if (input.daysUntilNext === null) {
    return {
      title: "经期记录提醒",
      body: "还没有足够的经期数据来进行预测，可以先去补几条记录 🌸",
      tag: "period-reminder",
      url: "/period",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilNext === 0) {
    return {
      title: "预计今天经期开始",
      body: "今天对自己温柔一点，节奏可以放慢 🌸",
      tag: "period-reminder",
      url: "/period",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilNext >= 1 && input.daysUntilNext <= 3) {
    return {
      title: `预计 ${input.daysUntilNext} 天后经期开始`,
      body: "这几天可以多留意身体感受，包里备一点常用东西 🌸",
      tag: "period-reminder",
      url: "/period",
      enabled: input.enabled,
    };
  }

  if (input.daysUntilNext > 3 && input.daysUntilNext <= 7) {
    return {
      title: `预计 ${input.daysUntilNext} 天后经期开始`,
      body: "快到预计时间了，日程可以给自己留点余地。",
      tag: "period-reminder",
      url: "/period",
      enabled: input.enabled,
    };
  }

  return {
    title: "经期记录",
    body: `预计 ${input.daysUntilNext} 天后开始，数据会越来越准哦 🌸`,
    tag: "period-reminder",
    url: "/period",
    enabled: input.enabled,
  };
}

/**
 * Generate all active reminders from the collected data.
 * Returns only reminders where enabled === true.
 */
export function generateAllReminders(input: {
  weather?: {
    weatherCode: number;
    temperature: number;
    rainProbability: number;
  };
  deadlines?: Array<{ title: string; daysUntilDue: number }>;
  missYou?: {
    nickname: string;
    daysUntilMeet: number | null;
  };
  period?: {
    daysUntilNext: number | null;
    cycleDay: number | null;
  };
  preferences: {
    weatherReminder: boolean;
    deadlineReminder: boolean;
    missYouReminder: boolean;
    periodReminder: boolean;
  };
}): ReminderPayload[] {
  const results: ReminderPayload[] = [];

  // Weather
  if (input.weather && input.preferences.weatherReminder) {
    results.push(
      generateWeatherReminder({
        weatherCode: input.weather.weatherCode,
        temperature: input.weather.temperature,
        rainProbability: input.weather.rainProbability,
        enabled: input.preferences.weatherReminder,
      })
    );
  }

  // Most urgent deadline
  if (input.deadlines && input.deadlines.length > 0 && input.preferences.deadlineReminder) {
    const sorted = [...input.deadlines].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    results.push(
      generateDeadlineReminder({
        title: sorted[0].title,
        daysUntilDue: sorted[0].daysUntilDue,
        enabled: input.preferences.deadlineReminder,
      })
    );
  }

  // Miss-you
  if (input.missYou && input.preferences.missYouReminder) {
    results.push(
      generateMissYouReminder({
        nickname: input.missYou.nickname,
        daysUntilMeet: input.missYou.daysUntilMeet,
        enabled: input.preferences.missYouReminder,
      })
    );
  }

  // Period
  if (input.period && input.preferences.periodReminder) {
    results.push(
      generatePeriodReminder({
        daysUntilNext: input.period.daysUntilNext,
        cycleDay: input.period.cycleDay,
        enabled: input.preferences.periodReminder,
      })
    );
  }

  return results;
}
