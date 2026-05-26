import { describe, expect, it } from "vitest";
import {
  calculateNextPeriodStart,
  calculatePeriodLength,
  getDaysUntilNextPeriod,
  validatePeriodRecord
} from "../lib/period";
import type { PeriodRecord } from "../lib/types";

describe("period calculations", () => {
  it("calculates inclusive period length", () => {
    expect(calculatePeriodLength("2026-05-01", "2026-05-05")).toBe(5);
    expect(calculatePeriodLength("2026-05-01")).toBe(1);
  });

  it("predicts next start from a single record", () => {
    const records: PeriodRecord[] = [{ id: "1", startDate: "2026-05-01" }];
    expect(calculateNextPeriodStart(records, { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 })).toBe("2026-05-29");
  });

  it("predicts next start from multiple records", () => {
    const records: PeriodRecord[] = [
      { id: "3", startDate: "2026-05-29" },
      { id: "2", startDate: "2026-05-01" },
      { id: "1", startDate: "2026-04-03" }
    ];
    expect(calculateNextPeriodStart(records, { averageCycleLength: 30, averagePeriodLength: 5, reminderDaysBefore: 2 })).toBe("2026-06-26");
  });

  it("calculates days until next period", () => {
    const records: PeriodRecord[] = [{ id: "1", startDate: "2026-05-01" }];
    expect(getDaysUntilNextPeriod(records, { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 }, new Date(2026, 4, 26))).toBe(3);
  });

  it("rejects records without start date", () => {
    expect(validatePeriodRecord({ note: "test" }).ok).toBe(false);
  });

  it("ignores soft deleted records in prediction", () => {
    const records: PeriodRecord[] = [
      { id: "2", startDate: "2026-05-20", deletedAt: "2026-05-21T00:00:00Z" },
      { id: "1", startDate: "2026-05-01" }
    ];
    expect(calculateNextPeriodStart(records, { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 })).toBe("2026-05-29");
  });
});
