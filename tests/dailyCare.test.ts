import { describe, expect, it } from "vitest";
import { getDailyCare } from "@/lib/dailyCare";
import type { Deadline } from "@/lib/types";

function deadline(overrides: Partial<Deadline> = {}): Deadline {
  return {
    id: "d1",
    title: "Essay",
    dueDate: "2026-05-26",
    dueTime: "23:59",
    priority: "medium",
    status: "todo",
    ...overrides
  };
}

describe("daily care engine", () => {
  it("is stable on the same day", () => {
    const a = getDailyCare({ now: new Date("2026-05-26T08:00:00Z") });
    const b = getDailyCare({ now: new Date("2026-05-26T20:00:00Z") });
    expect(a.greeting).toBe(b.greeting);
    expect(a.memoryHint).toBe(b.memoryHint);
    expect(a.dateKey).toBe("2026-05-26");
  });

  it("changes across days without external services", () => {
    const a = getDailyCare({ now: new Date("2026-05-26T08:00:00Z") });
    const b = getDailyCare({ now: new Date("2026-05-27T08:00:00Z") });
    expect(a.dateKey).not.toBe(b.dateKey);
  });

  it("prioritizes urgent deadline text", () => {
    const care = getDailyCare({
      deadlines: [deadline()],
      now: new Date("2026-05-26T08:00:00Z")
    });
    expect(care.topReminderText).toContain("Essay");
  });

  it("falls back when data is missing", () => {
    const care = getDailyCare({});
    expect(care.greeting).toContain("小乖");
    expect(care.careMessage).toBeTruthy();
  });
});
