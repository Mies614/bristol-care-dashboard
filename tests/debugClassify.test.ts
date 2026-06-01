import { describe, expect, it } from "vitest";
import {
  classifyDebugCheck,
  normalizeChecks,
  summarizeDebugHealth,
  formatDebugCopyText,
} from "@/lib/debug-classify";
import type { CheckOutput } from "@/lib/debug-classify";

describe("classifyDebugCheck", () => {
  it("returns 'success' when ok is true", () => {
    expect(classifyDebugCheck(true, false, false)).toBe("success");
    expect(classifyDebugCheck(true, true, false)).toBe("success");
    expect(classifyDebugCheck(true, false, true)).toBe("success");
  });

  it("returns 'warning' when warning is true and not ok", () => {
    expect(classifyDebugCheck(false, false, true)).toBe("warning");
  });

  it("returns 'optional' when optional is true and not ok and not warning", () => {
    expect(classifyDebugCheck(false, true, false)).toBe("optional");
  });

  it("returns 'failed' when not ok, not optional, not warning", () => {
    expect(classifyDebugCheck(false, false, false)).toBe("failed");
  });

  it("prefers warning over optional", () => {
    expect(classifyDebugCheck(false, true, true)).toBe("warning");
  });
});

describe("normalizeChecks", () => {
  it("handles old format with ok/optional", () => {
    const raw = [
      { name: "DB", ok: true, optional: false },
      { name: "Cache", ok: false, optional: false },
      { name: "Email", ok: false, optional: true },
    ];
    const result = normalizeChecks(raw as Array<Record<string, unknown>>);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ name: "DB", level: "success" });
    expect(result[1]).toMatchObject({ name: "Cache", level: "failed" });
    expect(result[2]).toMatchObject({ name: "Email", level: "optional" });
  });

  it("respects pre-computed level field", () => {
    const raw = [
      { name: "DB", level: "success" },
      { name: "Push", level: "warning" },
    ];
    const result = normalizeChecks(raw as Array<Record<string, unknown>>);
    expect(result[0]).toMatchObject({ name: "DB", level: "success" });
    expect(result[1]).toMatchObject({ name: "Push", level: "warning" });
  });

  it("sets default name for missing name field", () => {
    const raw = [{ ok: false }];
    const result = normalizeChecks(raw as Array<Record<string, unknown>>);
    expect(result[0].name).toBe("未知");
  });

  it("carries detail field through", () => {
    const raw = [{ name: "DB", ok: false, detail: "connection timeout" }];
    const result = normalizeChecks(raw as Array<Record<string, unknown>>);
    expect(result[0].detail).toBe("connection timeout");
  });
});

describe("summarizeDebugHealth", () => {
  it("returns 'healthy' for all success", () => {
    const checks: CheckOutput[] = [
      { name: "a", level: "success" },
      { name: "b", level: "success" },
    ];
    expect(summarizeDebugHealth(checks)).toBe("healthy");
  });

  it("returns 'needs_attention' when any failed", () => {
    const checks: CheckOutput[] = [
      { name: "a", level: "success" },
      { name: "b", level: "failed" },
    ];
    expect(summarizeDebugHealth(checks)).toBe("needs_attention");
  });

  it("returns 'warning' when no failed but there are warnings", () => {
    const checks: CheckOutput[] = [
      { name: "a", level: "success" },
      { name: "b", level: "warning" },
    ];
    expect(summarizeDebugHealth(checks)).toBe("warning");
  });

  it("ignores optional in health status", () => {
    const checks: CheckOutput[] = [
      { name: "a", level: "success" },
      { name: "b", level: "optional" },
    ];
    expect(summarizeDebugHealth(checks)).toBe("healthy");
  });
});

describe("formatDebugCopyText", () => {
  it("includes env and user agent", () => {
    const text = formatDebugCopyText([], {
      env: "test",
      userAgent: "vitest",
      storage: true,
      keyCount: 3,
    });
    expect(text).toContain("Bristol Care Diagnostics");
    expect(text).toContain("test");
    expect(text).toContain("vitest");
    expect(text).toContain("available");
    expect(text).toContain("(3 keys)");
  });

  it("includes fetch error details when provided", () => {
    const text = formatDebugCopyText([], {
      env: "test", userAgent: "vitest", storage: true, keyCount: 0,
    }, { status: 500, statusText: "Internal Server Error", message: "db timeout" });
    expect(text).toContain("500");
    expect(text).toContain("Internal Server Error");
    expect(text).toContain("db timeout");
  });

  it("sorts checks with failed first", () => {
    const checks: CheckOutput[] = [
      { name: "ok", level: "success" },
      { name: "bad", level: "failed" },
      { name: "warn", level: "warning" },
    ];
    const text = formatDebugCopyText(checks, {
      env: "test", userAgent: "vitest", storage: true, keyCount: 0,
    });
    const failedIdx = text.indexOf("[失败]");
    const successIdx = text.indexOf("[通过]");
    const warnIdx = text.indexOf("[警告]");
    expect(failedIdx).toBeLessThan(warnIdx);
    expect(failedIdx).toBeLessThan(successIdx);
  });

  it("does not expose secret-shaped strings in detail", () => {
    const checks: CheckOutput[] = [
      { name: "key", level: "success", detail: "found (hidden)" },
    ];
    const text = formatDebugCopyText(checks, {
      env: "test", userAgent: "vitest", storage: true, keyCount: 0,
    });
    expect(text).not.toContain("sb_secret_");
    expect(text).toContain("found (hidden)");
  });
});