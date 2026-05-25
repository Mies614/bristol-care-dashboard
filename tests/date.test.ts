import { describe, expect, it } from "vitest";
import { getDaysUntilDeadline, getDeadlineTone } from "@/lib/date";
import type { Deadline } from "@/lib/types";

describe("deadline date helpers", () => {
  it("calculates remaining days", () => {
    const deadline: Deadline = {
      id: "1",
      title: "Essay",
      dueDate: "2026-05-28",
      dueTime: "12:00",
      priority: "high",
      status: "todo"
    };

    expect(getDaysUntilDeadline(deadline, new Date("2026-05-25T12:00:00"))).toBe(3);
  });

  it("marks less than 24 hours as urgent", () => {
    const deadline: Deadline = {
      id: "1",
      title: "Essay",
      dueDate: "2026-05-26",
      dueTime: "09:00",
      priority: "high",
      status: "todo"
    };

    expect(getDeadlineTone(deadline, new Date("2026-05-25T12:00:00"))).toBe("urgent");
  });

  it("marks completed deadlines as done", () => {
    const deadline: Deadline = {
      id: "1",
      title: "Essay",
      dueDate: "2026-05-26",
      priority: "low",
      status: "done"
    };

    expect(getDeadlineTone(deadline, new Date("2026-05-25T12:00:00"))).toBe("done");
  });
});
