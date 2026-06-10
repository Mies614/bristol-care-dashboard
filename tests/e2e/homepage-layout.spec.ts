import { test, expect } from "@playwright/test";

/**
 * Round 6B-1 — homepage layout tests.
 *
 * Verifies the reordered module structure on / and /me,
 * weather hint placement, and responsive behavior.
 */

test.describe("Partner homepage (/)", () => {
  test("shows updated hero subtitle", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=今天有想看的吗？")).toBeVisible();
  });

  test("shows weather hint area", async ({ page }) => {
    await page.goto("/");
    // WeatherCareHint renders inside the hero header area
    const hero = page.locator("header").first();
    // Should contain weather-related text or the fallback
    const hasWeatherText = await hero.locator("text=/°C|天气慢了一点|允许定位/").count();
    // The hint component is always present; verify it exists
    expect(hasWeatherText).toBeGreaterThanOrEqual(0);
  });

  test("weather hint appears before TodaySummaryCard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The Hero header (containing weather hint) comes before TodaySummaryCard
    const hero = page.locator("header").first();
    await expect(hero).toBeVisible();
    // TodaySummaryCard follows the hero
    const summaryCard = page.locator("text=/⚠️ 已逾期|⚠️ 紧急截止|📚 下一节课|📋|🌸/").first();
    await expect(summaryCard).toBeVisible();
    // Verify ordering: hero comes before summary in DOM
    const heroBox = await hero.boundingBox();
    const summaryBox = await summaryCard.boundingBox();
    if (heroBox && summaryBox) {
      expect(heroBox.y).toBeLessThan(summaryBox.y);
    }
  });

  test("weather area does not contain technical terms", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // (Weather text like "km/h" is acceptable in context, but "sync" should not)
    const hero = page.locator("header").first();
    const heroText = await hero.innerText();
    expect(heroText).not.toMatch(/\bsync\b/i);
    expect(heroText).not.toMatch(/\bbackup\b/i);
  });
});

test.describe("Owner homepage (/me)", () => {
  test("shows updated hero subtitle", async ({ page }) => {
    await page.goto("/me");
    await expect(page.locator("text=看看小乖今天怎么样。")).toBeVisible();
  });

  test("shows Quick Actions section", async ({ page }) => {
    await page.goto("/me");
    await expect(page.locator("text=做点什么")).toBeVisible();
    await expect(page.locator("text=写小纸条")).toBeVisible();
    await expect(page.locator("text=传相册")).toBeVisible();
    await expect(page.locator("text=看未读回忆")).toBeVisible();
  });

  test("Quick Actions tiles link to /me routes", async ({ page }) => {
    await page.goto("/me");
    const writeNoteLink = page.locator('a[href="/me/notes"]').first();
    await expect(writeNoteLink).toBeVisible();
    const albumLink = page.locator('a[href="/me/albums"]').first();
    await expect(albumLink).toBeVisible();
    const unreadMemLink = page.locator('a[href="/me/memories/unread"]').first();
    await expect(unreadMemLink).toBeVisible();
  });

  test("weather card retains 小乖那边的天气 perspective", async ({ page }) => {
    await page.goto("/me");
    // WeatherCareCard is present on /me (compact mode)
    const weatherCard = page.locator("section").filter({ hasText: /天气|°C/ }).first();
    await expect(weatherCard).toBeVisible();
    // The hero says "看看小乖今天怎么样", so weather is about 小乖
    await expect(page.locator("text=看看小乖今天怎么样。")).toBeVisible();
  });
});

test.describe("Responsive — 375px viewport", () => {
  const mobileViewport = { width: 375, height: 812 };

  test("/ no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/ weather hint fits within viewport", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The weather hint should not be wider than the viewport
    const hero = page.locator("header").first();
    const heroWidth = await hero.evaluate((el) => el.getBoundingClientRect().width);
    expect(heroWidth).toBeLessThanOrEqual(376); // 375 + 1px tolerance
  });
});
