import type { Course, Deadline } from "./types";
import type { BristolWeather } from "./weather";
import { getDaysUntilDeadline } from "./date";
import { hasClassBefore10, hasEveningClass, getTodayCourses } from "./schedule";

export function buildSmartReminder(courses: Course[], deadlines: Deadline[], weather?: BristolWeather, now = new Date()) {
  const parts: string[] = [];
  const todayCourses = getTodayCourses(courses, now);

  if (hasClassBefore10(courses, now)) parts.push("今天上午 10 点前有课，早餐后可以早点出门。");
  if (hasEveningClass(courses, now)) parts.push("今天晚上还有课，回家路上慢慢走，记得主动确认到家。");
  if (weather && weather.rainProbability >= 60) parts.push("Bristol 今天很可能下雨，伞和防水鞋会很有用。");

  const urgent = deadlines
    .filter((deadline) => deadline.status === "todo" && getDaysUntilDeadline(deadline, now) <= 3)
    .sort((a, b) => getDaysUntilDeadline(a, now) - getDaysUntilDeadline(b, now))[0];
  if (urgent) parts.push(`「${urgent.title}」快到截止时间了，今天可以优先处理一点。`);

  if (todayCourses.length === 0) parts.push("今天没有课，可以自习、休息，或者整理一下手头的小任务。");

  return parts.length ? parts.join(" ") : "今天的节奏看起来不错，照顾好自己，按自己的步调来。";
}
