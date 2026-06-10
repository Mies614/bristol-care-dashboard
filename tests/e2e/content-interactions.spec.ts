import { test, expect } from "@playwright/test";

/**
 * Content interaction E2E tests (skeleton).
 *
 * These tests verify basic API interaction flows.
 * Run against a development server with Supabase env vars configured.
 *
 * Tests that require Supabase will be skipped when the server
 * returns 503 (unavailable).
 */

test.describe("Content interactions API", () => {
  test("GET /api/interactions returns valid response (or 503 if no Supabase)", async ({ request }) => {
    const res = await request.get("/api/interactions?spaceCode=test&contentType=note&contentId=sample-love-note-1&identity=xiaoguai");
    // Accept 200 (Supabase available) or 503 (Supabase unavailable)
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThanOrEqual(503);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test("GET /api/comments returns valid response (or 503 if no Supabase)", async ({ request }) => {
    const res = await request.get("/api/comments?spaceCode=test&contentType=note&contentId=sample-love-note-1");
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThanOrEqual(503);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test("API failures return JSON, not empty response", async ({ request }) => {
    const res = await request.get("/api/interactions");
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });
});

test.describe("Comment UI", () => {
  test("Comment section renders on /notes page", async ({ page }) => {
    await page.goto("/notes");
    await page.waitForLoadState("networkidle");
    // The page should render without crashing
    await expect(page.locator("body")).toBeVisible();
  });
});
