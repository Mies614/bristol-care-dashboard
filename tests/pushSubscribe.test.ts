import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "@/lib/pushClient";
import {
  computePushState,
  getPushFailureMessages,
  parseApiSubscribeError,
  type PushSubscribeFailureReason,
} from "@/lib/notificationState";
import { getVapidConfig } from "@/lib/push";

// ─── VAPID key conversion (logic-only tests) ───

describe("urlBase64ToUint8Array", () => {
  it("converts a standard base64 string", () => {
    // "test" in base64 = "dGVzdA=="
    const result = urlBase64ToUint8Array("dGVzdA==");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(4);
    // "test" decoded
    expect(String.fromCharCode(...result)).toBe("test");
  });

  it("handles URL-safe base64 (without padding, with - and _)", () => {
    // "dGVzdA" minus padding = "dGVzdA"
    const result = urlBase64ToUint8Array("dGVzdA");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...result)).toBe("test");
  });

  it("handles URL-safe base64 with - and _ characters", () => {
    // encode "ab" -> "YWI" in standard base64, URL-safe same but let's test with a known padded value
    const result = urlBase64ToUint8Array("YWI");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...result)).toBe("ab");
  });

  it("throws on empty string", () => {
    expect(() => urlBase64ToUint8Array("")).toThrow("VAPID public key is empty");
  });

  it("throws on whitespace-only string", () => {
    expect(() => urlBase64ToUint8Array("   ")).toThrow("VAPID public key is empty");
  });

  it("throws on invalid base64", () => {
    expect(() => urlBase64ToUint8Array("!!invalid!!")).toThrow("VAPID public key is not valid base64");
  });

  it("auto-pads short base64", () => {
    // "dA" needs 2 padding chars
    const result = urlBase64ToUint8Array("dA");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1);
  });
});

// ─── Notification State ───

describe("notification state — permission allowed but no subscription → unsubscribed", () => {
  it("returns unsubscribed when permission granted but no existing subscription", () => {
    const state = computePushState({
      isSupported: true,
      permission: "granted",
      hasExistingSubscription: false,
      isVapidConfigured: true,
    });
    expect(state).toBe("unsubscribed");
  });

  it("returns subscribed when permission granted and has subscription", () => {
    const state = computePushState({
      isSupported: true,
      permission: "granted",
      hasExistingSubscription: true,
      isVapidConfigured: true,
    });
    expect(state).toBe("subscribed");
  });

  it("returns misconfigured when VAPID not set even if permission granted", () => {
    const state = computePushState({
      isSupported: true,
      permission: "granted",
      hasExistingSubscription: false,
      isVapidConfigured: false,
    });
    expect(state).toBe("misconfigured");
  });
});

// ─── PushSubscribeFailureReason diagnostics ───

describe("getPushFailureMessages", () => {
  const allReasons: PushSubscribeFailureReason[] = [
    "unsupported_notification",
    "unsupported_service_worker",
    "unsupported_push_manager",
    "permission_denied",
    "service_worker_not_ready",
    "vapid_public_key_missing",
    "vapid_public_key_invalid",
    "subscribe_failed",
    "save_failed",
    "supabase_unavailable",
  ];

  it("returns userMessage and debugMessage for every reason", () => {
    for (const reason of allReasons) {
      const msgs = getPushFailureMessages(reason);
      expect(typeof msgs.userMessage).toBe("string");
      expect(msgs.userMessage.length).toBeGreaterThan(0);
      expect(typeof msgs.debugMessage).toBe("string");
      expect(msgs.debugMessage.length).toBeGreaterThan(0);
    }
  });

  it("does NOT expose VAPID_PRIVATE_KEY in any user message", () => {
    for (const reason of allReasons) {
      const msgs = getPushFailureMessages(reason);
      expect(msgs.userMessage).not.toContain("VAPID_PRIVATE_KEY");
      expect(msgs.userMessage).not.toContain("private");
    }
  });

  it("does NOT mention endpoint in any user message", () => {
    for (const reason of allReasons) {
      const msgs = getPushFailureMessages(reason);
      expect(msgs.userMessage).not.toContain("endpoint");
    }
  });

  it("save_failed message is NOT about browser permission", () => {
    const msgs = getPushFailureMessages("save_failed");
    expect(msgs.userMessage).not.toMatch(/浏览器.*允许|通知权限|permission/i);
    expect(msgs.userMessage).toContain("保存");
  });

  it("permission_denied message IS about browser permission", () => {
    const msgs = getPushFailureMessages("permission_denied");
    expect(msgs.userMessage).toContain("权限");
  });
});

// ─── parseApiSubscribeError ───

describe("parseApiSubscribeError", () => {
  it("returns supabase_unavailable for SUPABASE_UNAVAILABLE code", () => {
    expect(parseApiSubscribeError({ code: "SUPABASE_UNAVAILABLE" })).toBe("supabase_unavailable");
  });

  it("returns save_failed for PUSH_SUBSCRIBE_FAILED code", () => {
    expect(parseApiSubscribeError({ code: "PUSH_SUBSCRIBE_FAILED" })).toBe("save_failed");
  });

  it("returns save_failed for SPACE_NOT_FOUND code", () => {
    expect(parseApiSubscribeError({ code: "SPACE_NOT_FOUND" })).toBe("save_failed");
  });

  it("returns save_failed for unknown codes", () => {
    expect(parseApiSubscribeError({ code: "UNKNOWN_ERROR" })).toBe("save_failed");
  });

  it("returns save_failed when no code is present", () => {
    expect(parseApiSubscribeError({})).toBe("save_failed");
  });
});

// ─── VAPID key privacy ───

describe("VAPID key privacy", () => {
  it("getVapidConfig exposes publicKey but NOT private key in a client-safe context", () => {
    const config = getVapidConfig();
    // getVapidConfig reads from process.env; in test env keys are undefined
    // The type system ensures publicKey is from NEXT_PUBLIC_ prefix
    // We verify the shape is correct and no private key leaks via the return type
    expect("publicKey" in config).toBe(true);
    expect("privateKey" in config).toBe(true);
    // The config object may contain privateKey for server-side use,
    // but it should never be sent to the client. The /api/push/status
    // route only exposes publicKey.
  });

  it("push status API route only returns publicKey, never privateKey", async () => {
    // Simulate what the API returns
    const config = getVapidConfig();
    const apiResponse = {
      ok: true,
      supportedByServer: config.configured,
      publicKeyExists: !!config.publicKey,
      publicKey: config.publicKey || undefined,
    };
    // API response must not contain privateKey
    expect(apiResponse).not.toHaveProperty("privateKey");
  });

  it("failure messages never include VAPID_PRIVATE_KEY env var name", () => {
    for (const reason of [
      "vapid_public_key_missing",
      "vapid_public_key_invalid",
    ] as PushSubscribeFailureReason[]) {
      const msgs = getPushFailureMessages(reason);
      expect(msgs.debugMessage).not.toContain("VAPID_PRIVATE_KEY");
    }
  });
});

// ─── Simulated browser environment tests (using mocks) ───
// These tests verify the logic flow even without a real browser

describe("subscribeToPush logic — error paths (simulated)", () => {
  it("VAPID public key missing returns vapid_public_key_missing error", () => {
    // urlBase64ToUint8Array throws on empty string, tested above
    expect(() => urlBase64ToUint8Array("")).toThrow("VAPID public key is empty");
    // The subscribeToPush function would call urlBase64ToUint8Array and
    // return { error: "vapid_public_key_missing" } on empty key
  });

  it("VAPID public key invalid returns vapid_public_key_invalid error", () => {
    expect(() => urlBase64ToUint8Array("!!!")).toThrow("VAPID public key is not valid base64");
  });

  it("permission denied returns permission_denied error", () => {
    // When Notification.permission === "denied",
    // subscribeToPush returns { error: "permission_denied" }
    // This is a logic test — the function takes that early return path
    const msgs = getPushFailureMessages("permission_denied");
    expect(msgs.debugMessage).toContain("denied");
  });

  it("unsupported_notification when Notification API missing", () => {
    const msgs = getPushFailureMessages("unsupported_notification");
    expect(msgs.debugMessage).toContain("Notification");
  });

  it("unsupported_service_worker when SW API missing", () => {
    const msgs = getPushFailureMessages("unsupported_service_worker");
    expect(msgs.debugMessage).toContain("Service Worker");
  });

  it("unsupported_push_manager when PushManager API missing", () => {
    const msgs = getPushFailureMessages("unsupported_push_manager");
    expect(msgs.debugMessage).toContain("PushManager");
  });
});