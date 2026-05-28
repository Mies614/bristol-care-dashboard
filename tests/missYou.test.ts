import { describe, it, expect } from "vitest";

describe("Miss You API", () => {
  it("should have the miss-you API endpoint available", () => {
    expect("/api/miss-you").toBeDefined();
  });

  it("should return ok with GET request", async () => {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/miss-you?code=test-space&localDate=2026-05-28&limit=1`);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(typeof data.todayCount).toBe("number");
  });

  it("should return 400 for POST without localDate", async () => {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/miss-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "test-space" })
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("MISS_YOU_MISSING_DATE");
  });

  it("should return 404 for non-existent space", async () => {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/miss-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "non-existent-space", localDate: "2026-05-28" })
    });
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("SPACE_NOT_FOUND");
  });
});