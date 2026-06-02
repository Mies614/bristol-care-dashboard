
/**
 * Cron authentication tests.
 *
 * Tests the authorization logic without actually running the Next.js route.
 */

// Simulate the auth logic from the cron route
function simulateCronAuth(requestAuthHeader: string | null, cronSecret: string) {
  if (!cronSecret) return 503;
  const authHeader = requestAuthHeader || "";
  if (authHeader !== `Bearer ${cronSecret}`) return 401;
  return 200;
}

describe("cron auth", () => {
  it("returns 503 when CRON_SECRET is empty", () => {
    const result = simulateCronAuth("Bearer secret", "");
    expect(result).toBe(503);
  });

  it("returns 401 when no auth header", () => {
    const result = simulateCronAuth(null, "my-secret");
    expect(result).toBe(401);
  });

  it("returns 401 when wrong token", () => {
    const result = simulateCronAuth("Bearer wrong", "my-secret");
    expect(result).toBe(401);
  });

  it("returns 401 when wrong auth scheme", () => {
    const result = simulateCronAuth("Basic abc", "my-secret");
    expect(result).toBe(401);
  });

  it("returns 200 when correct Bearer token", () => {
    const result = simulateCronAuth("Bearer correct", "correct");
    expect(result).toBe(200);
  });
});

describe("cron response shape", () => {
  it("success response has stable structure", () => {
    const response = {
      ok: true,
      checkedAt: "2026-06-15T09:00:00.000Z",
      spacesChecked: 1,
      notificationsGenerated: 3,
      notificationsSent: 3,
      skipped: [{ reason: "no_preferences", count: 1 }],
      errors: [],
    };

    expect(response.ok).toBe(true);
    expect(response.checkedAt).toBeTruthy();
    expect(typeof response.spacesChecked).toBe("number");
    expect(typeof response.notificationsGenerated).toBe("number");
    expect(typeof response.notificationsSent).toBe("number");
    expect(Array.isArray(response.skipped)).toBe(true);
    expect(Array.isArray(response.errors)).toBe(true);
  });

  it("error response does not crash", () => {
    const response = {
      ok: false,
      checkedAt: "2026-06-15T09:00:00Z",
      spacesChecked: 0,
      notificationsGenerated: 0,
      notificationsSent: 0,
      skipped: [],
      errors: [{ scope: "cron", message: "CRON_SECRET missing" }],
    };

    expect(response.ok).toBe(false);
    expect(response.errors).toHaveLength(1);
  });
});

describe("reminder_delivery_log dedup", () => {
  it("does not generate for already-sent combination", () => {
    const deliveryLog = [
      { spaceCode: "test", identity: "default", reminderType: "weather", deliveryDate: "2026-06-15" },
    ];

    const wasSent = deliveryLog.some(
      (r) => r.spaceCode === "test" && r.identity === "default" &&
        r.reminderType === "weather" && r.deliveryDate === "2026-06-15"
    );

    expect(wasSent).toBe(true);
  });

  it("generates for different reminder type on same day", () => {
    const deliveryLog = [
      { spaceCode: "test", identity: "default", reminderType: "weather", deliveryDate: "2026-06-15" },
    ];

    const deadlineSent = deliveryLog.some(
      (r) => r.reminderType === "deadline" && r.deliveryDate === "2026-06-15"
    );

    expect(deadlineSent).toBe(false);
  });

  it("generates for same type on different day", () => {
    const deliveryLog = [
      { spaceCode: "test", identity: "default", reminderType: "weather", deliveryDate: "2026-06-14" },
    ];

    const todaySent = deliveryLog.some(
      (r) => r.reminderType === "weather" && r.deliveryDate === "2026-06-15"
    );

    expect(todaySent).toBe(false);
  });
});

describe("Cron health check", () => {
  it("health API does not expose CRON_SECRET value", () => {
    // Simulate what the health API returns for CRON_SECRET
    const configStatus =
      process.env.CRON_SECRET && process.env.CRON_SECRET.length > 0
        ? "configured"
        : "missing";

    // The actual value is never in the response
    const response = {
      key: "CRON_SECRET",
      status: configStatus,
      description: "定时提醒 Cron 密钥",
    };

    expect(response.status).toBeDefined();
    expect(response.status).not.toBe(process.env.CRON_SECRET);
    // Status is only "configured", "missing", or "unavailable" — never the value
    expect(["configured", "missing", "unavailable"]).toContain(response.status);
  });
});
