import { describe, expect, it } from "vitest";
import { formatTimeInZone, getBristolAndBeijingTime, getRelativeDayLabel } from "@/lib/timeZones";

describe("time zones", () => {
  it("formats Europe/London time", () => {
    expect(formatTimeInZone(new Date("2026-05-26T08:42:00Z"), "Europe/London")).toMatch(/\d{2}:\d{2}/);
  });

  it("formats Asia/Shanghai time", () => {
    expect(formatTimeInZone(new Date("2026-05-26T08:42:00Z"), "Asia/Shanghai")).toMatch(/\d{2}:\d{2}/);
  });

  it("labels Beijing as tomorrow when it is next day compared with Bristol", () => {
    const date = new Date("2026-05-26T16:30:00Z");
    expect(getRelativeDayLabel(date, date, "Asia/Shanghai")).toBe("明天");
    expect(getBristolAndBeijingTime(date).beijing.dayLabel).toBe("明天");
  });

  it("falls back for invalid dates", () => {
    expect(formatTimeInZone(new Date("bad"), "Europe/London")).toMatch(/\d{2}:\d{2}/);
  });
});
