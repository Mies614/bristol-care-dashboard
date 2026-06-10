import { test, expect } from "@playwright/test";

/**
 * Content interaction E2E tests (skeleton).
 *
 * These tests verify basic API interaction flows.
 * Run against a development server with Supabase env vars configured.
 *
 * NOTE: Full coverage requires Supabase to be available.
 * Tests will be skipped or adjusted based on environment.
 */

test.describe("Content interactions API", () => {
  test("GET /api/interactions returns valid response", async ({ request }) => {
    const res = await request.get("/api/interactions?spaceCode=test&contentType=note&contentId=sample-love-note-1&identity=xiaoguai");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should return JSON array or object
    expect(body).toBeDefined();
  });

  test("GET /api/comments returns valid response", async ({ request }) => {
    const res = await request.get("/api/comments?spaceCode=test&contentType=note&contentId=sample-love-note-1");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test("API failures return JSON, not empty response", async ({ request }) => {
    // Missing required params should not crash
    const res = await request.get("/api/interactions");
    // Should still return JSON (even if it's an error)
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });
});

test.describe("Comment UI", () => {
  test("Comment send button is visible on note page", async ({ page }) => {
    await page.goto("/notes");
    // Wait for page to render
    await page.waitForLoadState("networkidle");

    // Check if any comment section exists and has a send button
    // const sendButton = page.locator("button").filter({ hasText: /发送|Send|→/ });
    // This is a skeleton test — adjust selector based on actual UI
    // Comment button might be behind an expand interaction first
  });
});
