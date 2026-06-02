/**
 * Server-side reminder scheduling logic.
 *
 * Pure functions that:
 * 1. Determine which reminders to send based on time window and preferences
 * 2. Generate notification payloads using lib/reminderContent
 * 3. Check delivery log to prevent duplicates
 *
 * No DB access, no web-push calls — these happen in the Cron route handler.
 */

import {
  generateWeatherReminder,
  generateDeadlineReminder,
  generateMissYouReminder,
  generatePeriodReminder,
  type ReminderPayload,
} from "./reminderContent";
import type { BristolWeather } from "./weather";
import type { Deadline } from "./types";

export interface ServerReminderPreference {
  spaceCode: string;
  identity: string;
  enabled: boolean;
  weatherEnabled: boolean;
  deadlineEnabled: boolean;
  missYouEnabled: boolean;
  periodEnabled: boolean;
  reminderTime: string;
  timezone: string;
}

export interface ReminderDeliveryRecord {
  spaceCode: string;
  identity: string;
  reminderType: string;
  deliveryDate: string;
}

export interface SpaceData {
  spaceCode: string;
  weather?: BristolWeather;
  deadlines: Deadline[];
  nextMeetDate: string | null;
  nickname: string;
  periodDaysUntilNext: number | null;
  periodCycleDay: number | null;
}

export interface ScheduleInput {
  preferences: ServerReminderPreference[];
  spacesData: SpaceData[];
  deliveryLog: ReminderDeliveryRecord[];
  now: Date;
}

export interface ScheduleResult {
  notifications: NotificationToSend[];
  skipped: Array<{ reason: string; count: number }>;
}

export interface NotificationToSend {
  spaceCode: string;
  identity: string;
  payload: ReminderPayload & { type: string };
}

export function isWithinReminderWindow(now: Date, reminderTime: string): boolean {
  const [hour, minute] = reminderTime.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const scheduledMinutes = hour * 60 + minute;

  // Allow 5 min before, 15 min after
  const windowStart = scheduledMinutes - 5;
  const windowEnd = scheduledMinutes + 15;

  return currentMinutes >= windowStart && currentMinutes <= windowEnd;
}

function wasAlreadySent(
  spaceCode: string,
  identity: string,
  reminderType: string,
  today: string,
  deliveryLog: ReminderDeliveryRecord[]
): boolean {
  return deliveryLog.some(
    (r) =>
      r.spaceCode === spaceCode &&
      r.identity === identity &&
      r.reminderType === reminderType &&
      r.deliveryDate === today
  );
}

function getTodayStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function scheduleReminders(input: ScheduleInput): ScheduleResult {
  const notifications: NotificationToSend[] = [];
  const skippedReasons = new Map<string, number>();
  const today = getTodayStr(input.now);

  function skip(reason: string) {
    skippedReasons.set(reason, (skippedReasons.get(reason) || 0) + 1);
  }

  for (const pref of input.preferences) {
    if (!pref.enabled) {
      skip("reminder_disabled");
      continue;
    }

    if (!isWithinReminderWindow(input.now, pref.reminderTime)) {
      skip("outside_time_window");
      continue;
    }

    const spaceData = input.spacesData.find(
      (s) => s.spaceCode === pref.spaceCode
    );
    if (!spaceData) {
      skip("space_data_not_found");
      continue;
    }

    // Weather
    if (pref.weatherEnabled && spaceData.weather) {
      if (!wasAlreadySent(pref.spaceCode, pref.identity, "weather", today, input.deliveryLog)) {
        const payload = generateWeatherReminder({
          weatherCode: spaceData.weather.weatherCode,
          temperature: spaceData.weather.temperature,
          rainProbability: spaceData.weather.rainProbability,
          enabled: true,
        });
        notifications.push({ spaceCode: pref.spaceCode, identity: pref.identity, payload: { ...payload, type: "weather" } });
      } else skip("weather_already_sent");
    } else if (pref.weatherEnabled && !spaceData.weather) {
      skip("weather_data_unavailable");
    }

    // Deadline
    if (pref.deadlineEnabled && spaceData.deadlines.length > 0) {
      if (!wasAlreadySent(pref.spaceCode, pref.identity, "deadline", today, input.deliveryLog)) {
        const urgent = spaceData.deadlines
          .filter((d) => d.status !== "done")
          .sort((a, b) => getDaysUntilDue(a, input.now) - getDaysUntilDue(b, input.now))[0];
        if (urgent) {
          const days = getDaysUntilDue(urgent, input.now);
          if (days >= -1 && days <= 3) {
            const payload = generateDeadlineReminder({ title: urgent.title, daysUntilDue: days, enabled: true });
            notifications.push({ spaceCode: pref.spaceCode, identity: pref.identity, payload: { ...payload, type: "deadline" } });
          } else skip("deadline_outside_range");
        }
      } else skip("deadline_already_sent");
    } else if (pref.deadlineEnabled && spaceData.deadlines.length === 0) {
      skip("deadline_no_data");
    }

    // Miss-you
    if (pref.missYouEnabled) {
      if (!wasAlreadySent(pref.spaceCode, pref.identity, "miss_you", today, input.deliveryLog)) {
        const daysUntilMeet = spaceData.nextMeetDate
          ? computeDaysUntilMeet(spaceData.nextMeetDate, input.now)
          : null;
        const payload = generateMissYouReminder({ nickname: spaceData.nickname || "小乖", daysUntilMeet, enabled: true });
        notifications.push({ spaceCode: pref.spaceCode, identity: pref.identity, payload: { ...payload, type: "miss_you" } });
      } else skip("miss_you_already_sent");
    }

    // Period
    if (pref.periodEnabled) {
      if (!wasAlreadySent(pref.spaceCode, pref.identity, "period", today, input.deliveryLog)) {
        const payload = generatePeriodReminder({ daysUntilNext: spaceData.periodDaysUntilNext, cycleDay: spaceData.periodCycleDay, enabled: true });
        notifications.push({ spaceCode: pref.spaceCode, identity: pref.identity, payload: { ...payload, type: "period" } });
      } else skip("period_already_sent");
    }
  }

  return {
    notifications,
    skipped: Array.from(skippedReasons.entries()).map(([reason, count]) => ({ reason, count })),
  };
}

function getDaysUntilDue(deadline: Deadline, now: Date): number {
  const due = new Date(`${deadline.dueDate}T${deadline.dueTime || "23:59"}:00`);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function computeDaysUntilMeet(targetDate: string, now: Date): number | null {
  if (!targetDate) return null;
  try {
    const target = new Date(`${targetDate}T00:00:00`);
    if (isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}
