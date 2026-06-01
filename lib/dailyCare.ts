import type { BristolWeather } from "./weather";
import type { Course, Deadline, LoveNote, PeriodRecord, PeriodSettings } from "./types";
import type { RandomMemoryItem } from "./randomMemory";
import { getDaysUntilDeadline } from "./date";
import { calculateNextPeriodStart, getDaysUntilNextPeriod } from "./period";

export type DailyCareResult = {
  greeting: string;
  careMessage: string;
  topReminderText: string;
  memoryHint: string;
  dateKey: string;
};

export type DailyCareInput = {
  weather?: BristolWeather;
  todayCourses?: Course[];
  deadlines?: Deadline[];
  periodRecords?: PeriodRecord[];
  periodSettings?: PeriodSettings;
  featuredNote?: LoveNote | null;
  randomMemory?: RandomMemoryItem | null;
  now?: Date;
};

function dateKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickStable<T>(items: T[], key: string, salt: string): T {
  return items[hashText(`${key}-${salt}`) % items.length];
}

export function getDailyCare(input: DailyCareInput): DailyCareResult {
  const now = input.now || new Date();
  const key = dateKey(now);
  const courses = input.todayCourses || [];
  const deadlines = (input.deadlines || []).filter((deadline) => deadline.status !== "done");
  const urgentDeadline = deadlines
    .map((deadline) => ({ deadline, days: getDaysUntilDeadline(deadline, now) }))
    .sort((a, b) => a.days - b.days)[0];
  const daysUntilPeriod = input.periodRecords && input.periodSettings
    ? getDaysUntilNextPeriod(input.periodRecords, input.periodSettings, now)
    : null;
  const nextPeriod = input.periodRecords && input.periodSettings
    ? calculateNextPeriodStart(input.periodRecords, input.periodSettings)
    : null;

  const greeting = pickStable([
    "小乖，今天也慢慢来",
    "小乖，今天先照顾好自己",
    "小乖，今天不用急着赶路"
  ], key, "greeting");

  const weatherText = input.weather
    ? `Bristol 现在大概 ${Math.round(input.weather.temperature)}°，体感 ${Math.round(input.weather.apparentTemperature)}°。`
    : "Bristol 的天气还在加载，先按舒服的节奏来。";
  const courseText = courses.length
    ? `今天有 ${courses.length} 节课，出门前看一眼时间就好。`
    : "今天课程不多，可以把节奏放松一点。";

  let topReminderText = "今天没有特别紧急的事，先从最容易的一小步开始。";
  if (urgentDeadline && urgentDeadline.days <= 0) {
    topReminderText = `先看一下「${urgentDeadline.deadline.title}」，今天把最关键的一步做掉。`;
  } else if (urgentDeadline && urgentDeadline.days <= 3) {
    topReminderText = `「${urgentDeadline.deadline.title}」还有 ${urgentDeadline.days} 天，可以提前拆成小块。`;
  } else if (courses[0]) {
    topReminderText = `下一件要留意的是 ${courses[0].startTime} 的 ${courses[0].name}。`;
  } else if (daysUntilPeriod !== null && daysUntilPeriod <= 3 && daysUntilPeriod >= 0) {
    topReminderText = `预计 ${nextPeriod || "这几天"} 附近开始，今天对身体温柔一点。`;
  }

  const careMessage = `${weatherText} ${courseText}`;
  const memoryHint = input.featuredNote?.content
    ? `今天的小纸条：${input.featuredNote.content.slice(0, 28)}${input.featuredNote.content.length > 28 ? "..." : ""}`
    : input.randomMemory?.title
      ? `可以随机翻到一张回忆：${input.randomMemory.title}`
      : pickStable([
        "今天也可以留一张新的小纸条。",
        "有一瞬间觉得可爱，就把它收进回忆里。",
        "不用每天都很精彩，普通的一天也值得被记住。"
      ], key, "memory");

  return {
    greeting,
    careMessage,
    topReminderText,
    memoryHint,
    dateKey: key
  };
}