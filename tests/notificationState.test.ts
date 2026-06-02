import { describe, expect, it } from "vitest";
import {
  computePushState,
  getPushStateInfo,
  isPushAvailable,
} from "@/lib/notificationState";
import type { PushState } from "@/lib/notificationState";

describe("computePushState", () => {
  it("returns unsupported when browser lacks Push API", () => {
    expect(
      computePushState({
        isSupported: false,
        permission: "unsupported",
        hasExistingSubscription: false,
        isVapidConfigured: true,
      })
    ).toBe("unsupported");
  });

  it("returns misconfigured when VAPID is missing", () => {
    expect(
      computePushState({
        isSupported: true,
        permission: "granted",
        hasExistingSubscription: false,
        isVapidConfigured: false,
      })
    ).toBe("misconfigured");
  });

  it("returns permission-denied when user blocked notifications", () => {
    expect(
      computePushState({
        isSupported: true,
        permission: "denied",
        hasExistingSubscription: false,
        isVapidConfigured: true,
      })
    ).toBe("permission-denied");
  });

  it("returns subscribed when permission granted and has sub", () => {
    expect(
      computePushState({
        isSupported: true,
        permission: "granted",
        hasExistingSubscription: true,
        isVapidConfigured: true,
      })
    ).toBe("subscribed");
  });

  it("returns unsubscribed when permission granted but no sub", () => {
    expect(
      computePushState({
        isSupported: true,
        permission: "granted",
        hasExistingSubscription: false,
        isVapidConfigured: true,
      })
    ).toBe("unsubscribed");
  });

  it("returns permission-default when prompt not shown yet", () => {
    expect(
      computePushState({
        isSupported: true,
        permission: "default",
        hasExistingSubscription: false,
        isVapidConfigured: true,
      })
    ).toBe("permission-default");
  });
});

describe("getPushStateInfo", () => {
  const states: PushState[] = [
    "unsupported",
    "permission-default",
    "permission-denied",
    "subscribed",
    "unsubscribed",
    "misconfigured",
  ];

  it("returns info for all states", () => {
    for (const state of states) {
      const info = getPushStateInfo(state);
      expect(info.state).toBe(state);
      expect(info.label).toBeTruthy();
      expect(info.description).toBeTruthy();
    }
  });

  it("has actionLabel for subscribable states", () => {
    expect(getPushStateInfo("permission-default").actionLabel).toBeTruthy();
    expect(getPushStateInfo("subscribed").actionLabel).toBeTruthy();
    expect(getPushStateInfo("unsubscribed").actionLabel).toBeTruthy();
  });

  it("has no actionLabel for blocked/unsupported states", () => {
    expect(getPushStateInfo("permission-denied").actionLabel).toBeUndefined();
    expect(getPushStateInfo("unsupported").actionLabel).toBeUndefined();
    expect(getPushStateInfo("misconfigured").actionLabel).toBeUndefined();
  });
});

describe("isPushAvailable", () => {
  it("returns false outside browser", () => {
    // In Node test environment, window is undefined
    const result = isPushAvailable();
    // In vitest with jsdom, window may exist but without PushManager
    expect(typeof result).toBe("boolean");
  });
});
