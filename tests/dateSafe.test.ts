import { describe, expect, it } from "vitest";
import {
  formatDateSafe,
  formatDateTimeSafe,
  formatRelativeTimeSafe,
  formatCountdownSafe,
  toDateStringSafe,
  isValidDateString,
} from "@/lib/date";

describe("formatDateSafe", () => {
  it("formats valid ISO string", () => {
    const result = formatDateSafe("2026-06-15T10:00:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("未知日期");
    expect(result).not.toContain("Invalid");
  });

  it("returns fallback for null", () => {
    expect(formatDateSafe(null)).toBe("未知日期");
    expect(formatDateSafe(undefined)).toBe("未知日期");
  });

  it("returns fallback for invalid date", () => {
    expect(formatDateSafe("not-a-date")).toBe("未知日期");
    expect(formatDateSafe("")).toBe("未知日期");
  });

  it("uses custom fallback", () => {
    expect(formatDateSafe(null, "暂无")).toBe("暂无");
  });
});

describe("formatDateTimeSafe", () => {
  it("returns fallback for null", () => {
    expect(formatDateTimeSafe(null)).toBe("未知时间");
  });

  it("returns fallback for invalid", () => {
    expect(formatDateTimeSafe("invalid")).toBe("未知时间");
  });

  it("formats valid date", () => {
    const result = formatDateTimeSafe("2026-06-15T10:00:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toContain("Invalid");
    expect(result).toContain("6月");
    expect(result).toContain("15");
  });
});

describe("formatRelativeTimeSafe", () => {
  it("returns fallback for null", () => {
    expect(formatRelativeTimeSafe(null)).toBe("");
  });

  it("returns '刚刚' for very recent time", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeTimeSafe(recent)).toBe("刚刚");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTimeSafe(fiveMinAgo);
    expect(result).toContain("分钟前");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTimeSafe(twoHoursAgo);
    expect(result).toContain("小时前");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTimeSafe(threeDaysAgo);
    expect(result).toContain("天前");
  });

  it("never returns Invalid Date", () => {
    const results = [
      formatRelativeTimeSafe("bad"),
      formatRelativeTimeSafe(""),
      formatRelativeTimeSafe(null),
      formatRelativeTimeSafe(undefined),
    ];
    for (const r of results) {
      expect(r).not.toContain("Invalid");
      expect(r).not.toContain("NaN");
      expect(r).not.toContain("undefined");
    }
  });
});

describe("formatCountdownSafe", () => {
  it("returns null for null input", () => {
    expect(formatCountdownSafe(null)).toBeNull();
    expect(formatCountdownSafe(undefined)).toBeNull();
  });

  it("returns '今天' for today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(formatCountdownSafe(today)).toBe("今天");
  });

  it("returns '明天' for tomorrow", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(formatCountdownSafe(tomorrow)).toBe("明天");
  });

  it("returns days for future date", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const result = formatCountdownSafe(future);
    expect(result).toContain("天后");
  });

  it("returns '已经到啦' for past date", () => {
    expect(formatCountdownSafe("2020-01-01")).toBe("已经到啦");
  });

  it("returns null for invalid date", () => {
    expect(formatCountdownSafe("not-a-date")).toBeNull();
    expect(formatCountdownSafe("")).toBeNull();
  });
});

describe("toDateStringSafe", () => {
  it("converts ISO to YYYY-MM-DD", () => {
    expect(toDateStringSafe("2026-06-15T10:00:00Z")).toBe("2026-06-15");
  });

  it("returns fallback for null", () => {
    expect(toDateStringSafe(null)).toBe("");
    expect(toDateStringSafe(null, "无")).toBe("无");
  });
});

describe("isValidDateString", () => {
  it("returns true for valid ISO", () => {
    expect(isValidDateString("2026-06-15")).toBe(true);
    expect(isValidDateString("2026-06-15T10:00:00Z")).toBe(true);
  });

  it("returns false for null/undefined", () => {
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });

  it("returns false for invalid string", () => {
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });
});
