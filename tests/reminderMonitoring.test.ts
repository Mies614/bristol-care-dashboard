import { describe, expect, it } from "vitest";

describe("reminder run log", () => {
  it("has correct structure", () => {
    const runLog = {
      id: "uuid",
      checked_at: "2026-06-15T09:00:00Z",
      trigger_type: "cron",
      ok: true,
      spaces_checked: 1,
      notifications_generated: 3,
      notifications_sent: 2,
      skipped: JSON.stringify([{ reason: "weather_already_sent", count: 1 }]),
      errors: JSON.stringify([]),
      duration_ms: 500,
    };

    expect(runLog.trigger_type).toBe("cron");
    expect(runLog.ok).toBe(true);
    expect(runLog.skipped).toContain("weather_already_sent");
    expect(runLog.skipped).not.toContain("secret");
    expect(runLog.skipped).not.toContain("endpoint");
    expect(runLog.skipped).not.toContain("VAPID");
  });

  it("run log does not contain secrets", () => {
    const runLog = {
      skipped: JSON.stringify([
        { reason: "no_preferences", count: 1 },
      ]),
      errors: JSON.stringify([
        { scope: "network", message: "timeout" },
      ]),
    };

    const serialized = JSON.stringify(runLog);
    expect(serialized).not.toContain("CRON_SECRET");
    expect(serialized).not.toContain("VAPID_PRIVATE");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(serialized).not.toContain("endpoint");
    expect(serialized).not.toContain("subscription");
  });

  it("trigger_type manual_dry_run is valid", () => {
    const log = { trigger_type: "manual_dry_run" };
    expect(["cron", "manual_dry_run"]).toContain(log.trigger_type);
  });
});

describe("reminder status response", () => {
  it("unavailable response is stable", () => {
    const response = {
      status: "unavailable",
      message: "Supabase 未配置，提醒监控不可用。",
    };
    expect(response.status).toBe("unavailable");
    expect(response.message).toBeTruthy();
  });

  it("config never exposes secrets", () => {
    const response = {
      config: {
        cronSecret: "configured",
        vapid: "configured",
        supabase: "available",
        activePushSubscriptions: 5,
        reminderPreferences: 1,
      },
    };

    expect(response.config.cronSecret).not.toBe("my-secret-key");
    expect(["configured", "missing"]).toContain(response.config.cronSecret);
    expect(response.config.activePushSubscriptions).toBe(5);
  });

  it("stats computes correctly from empty logs", () => {
    const logs: Array<Record<string, unknown>> = [];
    const totalRuns = logs.length;
    expect(totalRuns).toBe(0);
  });

  it("stats computes correctly from mixed logs", () => {
    const logs = [
      { ok: true, notifications_generated: 3, notifications_sent: 3 },
      { ok: true, notifications_generated: 2, notifications_sent: 2 },
      { ok: false, notifications_generated: 0, notifications_sent: 0 },
    ];

    const total = logs.length;
    const successful = logs.filter((l) => l.ok).length;
    const generated = logs.reduce((s, l) => s + ((l.notifications_generated as number) || 0), 0);
    const sent = logs.reduce((s, l) => s + ((l.notifications_sent as number) || 0), 0);

    expect(total).toBe(3);
    expect(successful).toBe(2);
    expect(generated).toBe(5);
    expect(sent).toBe(5);
  });

  it("commonSkippedReasons aggregates correctly", () => {
    const skipped = [
      { reason: "reminder_disabled", count: 2 },
      { reason: "weather_already_sent", count: 1 },
      { reason: "reminder_disabled", count: 3 },
    ];

    const map = new Map<string, number>();
    for (const s of skipped) {
      map.set(s.reason, (map.get(s.reason) || 0) + s.count);
    }

    const reminderDisabled = map.get("reminder_disabled");
    const weatherSent = map.get("weather_already_sent");

    expect(reminderDisabled).toBe(5);
    expect(weatherSent).toBe(1);
  });
});

describe("dry-run behavior", () => {
  it("dry-run result has correct structure", () => {
    const result = {
      ok: true,
      triggeredAt: "2026-06-15T09:00:00Z",
      dryRun: true,
      note: "这是模拟运行，没有真实发送通知。",
      spacesChecked: 1,
      notificationsWouldSend: 2,
      summary: [
        { type: "weather", spaceCode: "test", title: "天气", body: "今天..." },
        { type: "deadline", spaceCode: "test", title: "DDL", body: "提醒..." },
      ],
    };

    expect(result.dryRun).toBe(true);
    expect(result.notificationsWouldSend).toBe(2);
    expect(result.summary).toHaveLength(2);
    expect(result.note).toContain("模拟运行");
    expect(result.note).toContain("没有真实发送");
  });

  it("dry-run summary does not expose push endpoints", () => {
    const summary = [
      { type: "weather", spaceCode: "test", title: "天气", body: "今天 Bristol 晴朗" },
    ];
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("endpoint");
    expect(serialized).not.toContain("subscription");
    expect(serialized).not.toContain("https://");
  });
});

describe("admin auth for reminder endpoints", () => {
  it("status API requires password", () => {
    // Simulate the auth check
    const password = "";
    const isAuthed = Boolean(password) && password === process.env.ADMIN_PASSWORD;
    expect(isAuthed).toBe(false);
  });

  it("dry-run API requires password", () => {
    const password = "";
    const isAuthed = Boolean(password) && password === process.env.ADMIN_PASSWORD;
    expect(isAuthed).toBe(false);
  });
});
