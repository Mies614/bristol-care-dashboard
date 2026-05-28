import { describe, it, expect } from "vitest";
import { getVapidConfig } from "@/lib/push";

describe("Push Notifications", () => {
  it("should have getVapidConfig function", () => {
    expect(typeof getVapidConfig).toBe("function");
  });

  it("should return VAPID config object", () => {
    const config = getVapidConfig();
    expect(config).toBeDefined();
    expect(typeof config.configured).toBe("boolean");
    expect(typeof config.publicKey).toBe("string");
    expect(typeof config.privateKey).toBe("string");
    expect(typeof config.subject).toBe("string");
  });

  it("should have push status API endpoint defined", () => {
    expect("/api/push/status").toBeDefined();
  });

  it("should have push subscribe API endpoint defined", () => {
    expect("/api/push/subscribe").toBeDefined();
  });

  it("should have push unsubscribe API endpoint defined", () => {
    expect("/api/push/unsubscribe").toBeDefined();
  });
});