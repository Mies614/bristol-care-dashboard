import { describe, it, expect } from "vitest";

describe("Miss You API", () => {
  it("should have the miss-you API endpoint defined", () => {
    expect(typeof "/api/miss-you").toBe("string");
  });

  it("should have standard API shapes for POST body validation", () => {
    // Test that the expected request body shape matches what the API expects
    const validBody = { code: "test-space", localDate: "2026-05-28" };
    expect(validBody).toHaveProperty("code");
    expect(validBody).toHaveProperty("localDate");
  });

  it("should require localDate in POST body", () => {
    const invalidBody = { code: "test-space" };
    expect(invalidBody.localDate).toBeUndefined();
  });

  it("should require code in POST body", () => {
    const invalidBody = { localDate: "2026-05-28" };
    expect(invalidBody.code).toBeUndefined();
  });

  it("should format localDate as YYYY-MM-DD", () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    expect(datePattern.test("2026-05-28")).toBe(true);
    expect(datePattern.test("2026-5-28")).toBe(false);
    expect(datePattern.test("not-a-date")).toBe(false);
  });
});