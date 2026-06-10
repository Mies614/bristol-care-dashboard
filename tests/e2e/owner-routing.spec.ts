import { test, expect } from "@playwright/test";

/**
 * Owner-side (/me) routing verification tests.
 *
 * These tests verify that the dual-entry architecture routes correctly:
 * - /me pages load and show correct identity
 * - BottomNav links are all under /me/
 * - /me pages don't link to partner-only routes
 */

test.describe("Owner-side routing (/me)", () => {
  test("/me home page loads", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me$/);
    // The page should render without crashing
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

  test("/me page does not show partner /notes as primary entry", async ({ page }) => {
    await page.goto("/me");
    // Check that any prominent "notes" link points to /me/notes or sub-page, not /notes
    const notesLink = page.locator('a[href="/notes"]');
    await expect(notesLink).toHaveCount(0);
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
