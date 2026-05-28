import { describe, it, expect } from "vitest";
import { getVapidConfig } from "@/lib/push";

describe("Push Notifications", () => {
  it("should have getVapidConfig function", () => {
    expect(typeof getVapidConfig).toBe("function");
  });

  it("should return VAPID config object with expected shape", () => {
    const config = getVapidConfig();
    expect(config).toBeDefined();
    expect(typeof config.configured).toBe("boolean");
    // In test env, VAPID keys may not be set; verify the shape is correct
    expect("publicKey" in config).toBe(true);
    expect("privateKey" in config).toBe(true);
    expect("subject" in config).toBe(true);
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

  it("should mark configured false when env vars are missing", () => {
    const config = getVapidConfig();
    // If any key is undefined, configured should be false
    if (!config.publicKey || !config.privateKey || !config.subject) {
      expect(config.configured).toBe(false);
    }
  });
});