const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}:${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("zh-CN", { timeZone, ...options });
  formatterCache.set(key, formatter);
  return formatter;
}

function safeDate(date: Date) {
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}

export function formatTimeInZone(date: Date, timeZone: string) {
  try {
    return getFormatter(timeZone, { hour: "2-digit", minute: "2-digit", hour12: false }).format(safeDate(date));
  } catch {
    return safeDate(date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
}

function formatDateKey(date: Date, timeZone: string) {
  try {
    const parts = getFormatter(timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(safeDate(date));
    const year = parts.find((part) => part.type === "year")?.value || "1970";
    const month = parts.find((part) => part.type === "month")?.value || "01";
    const day = parts.find((part) => part.type === "day")?.value || "01";
    return `${year}-${month}-${day}`;
  } catch {
    return safeDate(date).toISOString().slice(0, 10);
  }
}

export function getRelativeDayLabel(baseDate: Date, targetDate: Date, targetTimeZone: string) {
  const baseKey = formatDateKey(baseDate, "Europe/London");
  const targetKey = formatDateKey(targetDate, targetTimeZone);
  if (targetKey === baseKey) return "今天";

  const baseUtc = Date.UTC(Number(baseKey.slice(0, 4)), Number(baseKey.slice(5, 7)) - 1, Number(baseKey.slice(8, 10)));
  const targetUtc = Date.UTC(Number(targetKey.slice(0, 4)), Number(targetKey.slice(5, 7)) - 1, Number(targetKey.slice(8, 10)));
  const diffDays = Math.round((targetUtc - baseUtc) / 86_400_000);
  if (diffDays === 1) return "明天";
  if (diffDays === -1) return "昨天";
  return targetKey;
}

export function getBristolAndBeijingTime(date: Date) {
  const safe = safeDate(date);
  return {
    bristol: {
      label: "Bristol",
      time: formatTimeInZone(safe, "Europe/London"),
      dayLabel: "今天"
    },
    beijing: {
      label: "北京",
      time: formatTimeInZone(safe, "Asia/Shanghai"),
      dayLabel: getRelativeDayLabel(safe, safe, "Asia/Shanghai")
    }
  };
}
