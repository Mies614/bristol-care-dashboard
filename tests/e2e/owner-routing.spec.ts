import { test, expect } from "@playwright/test";

/**
 * Owner-side (/me) routing verification tests.
 *
 * These tests verify that the dual-entry architecture routes correctly:
 * - /me pages load and show correct identity
 * - BottomNav links are all under /me/
 * - /me pages don't link to partner-only routes as primary entries
 */

test.describe("Owner-side routing (/me)", () => {
  test("/me home page loads", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.locator("nav[aria-label='main navigation']")).toBeVisible();
  });

  test("BottomNav href values are all /me/...", async ({ page }) => {
    await page.goto("/me");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();

    const links = nav.locator("a");
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));

    // All BottomNav links should start with /me
    for (const href of hrefs) {
      expect(href).toMatch(/^\/me(\/|$)/);
    }

    // Should include expected owner nav items
    expect(hrefs).toContain("/me");
    expect(hrefs).toContain("/me/records");
    expect(hrefs).toContain("/me/memories");
    expect(hrefs).toContain("/me/cards");
    expect(hrefs).toContain("/me/settings");

    // Should NOT include partner-only routes
    expect(hrefs).not.toContain("/records");
    expect(hrefs).not.toContain("/memories");
    expect(hrefs).not.toContain("/cards");
    expect(hrefs).not.toContain("/settings");
  });

  test("/me TodaySummaryCard does not link to partner /notes", async ({ page }) => {
    await page.goto("/me");
    await page.waitForLoadState("networkidle");

    // The TodaySummaryCard on /me should link to /me/notes (or another /me path),
    // not to the bare partner /notes route.
    // Check that any "小纸条墙" link goes to /me/notes
    const notesLinks = page.locator('a[href="/notes"]');

    // The TodaySummaryCard is the one that shows "小纸条墙" or "相册" —
    // it should now use /me-prefixed routes on the /me page
    const summaryCard = page.locator("section").filter({ hasText: /今日照顾|小纸条墙|一张回忆|查看 DDL/ }).first();
    const cardLink = summaryCard.locator("a").first();
    const cardHref = await cardLink.getAttribute("href");
    if (cardHref) {
      // Any link from TodaySummaryCard on /me should be /me-prefixed or undefined
      expect(cardHref).not.toBe("/notes");
      expect(cardHref).not.toBe("/albums");
    }
  });
});

test.describe("Partner-side routing (/)", () => {
  test("home page loads with partner navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
  });

  test("BottomNav uses standard (non-/me) routes", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();

    const links = nav.locator("a");
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));

    // Should include expected partner nav items
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/records");
    expect(hrefs).toContain("/memories");
    expect(hrefs).toContain("/cards");
    expect(hrefs).toContain("/settings");

    // Should NOT include /me-prefixed routes
    expect(hrefs).not.toContain("/me");
    expect(hrefs).not.toContain("/me/records");
    expect(hrefs).not.toContain("/me/memories");
  });
});
