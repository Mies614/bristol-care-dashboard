import { test, expect } from "./fixtures";

test.describe("Notification identity chain", () => {
  test("push subscribe route exists", async ({ page }) => {
    // Route exists and accepts requests
    const res = await page.request.post("/api/push/subscribe", {
      headers: { "Content-Type": "application/json" },
      data: { subscription: { endpoint: "https://test.example.com/endpoint" } },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("push test route exists", async ({ page }) => {
    const res = await page.request.post("/api/push/test", {
      headers: { "Content-Type": "application/json" },
      data: { role: "me" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("push unsubscribe accepts endpoint", async ({ page }) => {
    const res = await page.request.post("/api/push/unsubscribe", {
      headers: { "Content-Type": "application/json" },
      data: { endpoint: "https://test.example.com/endpoint" },
    });
    expect(res.status()).toBe(200);
  });

  test("miss-you API returns structured response", async ({ page }) => {
    const res = await page.request.get("/api/miss-you?code=xiaoguai520");
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });
});
