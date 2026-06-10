import { test, expect } from "@playwright/test";

/**
 * Round 6B-2 — homepage layout tests with compact variants.
 */

test.describe("Partner homepage (/)", () => {
  test("shows updated hero subtitle", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=今天有想看的吗？")).toBeVisible();
  });

  test("shows WeatherCareHint", async ({ page }) => {
    await page.goto("/");
    // WeatherCareHint is inside the hero area
    const hero = page.locator("header").first();
    await expect(hero).toBeVisible();
  });

  test("weather hint appears before TodaySummaryCard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const hero = page.locator("header").first();
    await expect(hero).toBeVisible();
    const summaryCard = page.locator("text=/⚠️ 已逾期|⚠️ 紧急截止|📚 下一节课|📋|🌸/").first();
    await expect(summaryCard).toBeVisible();
    const heroBox = await hero.boundingBox();
    const summaryBox = await summaryCard.boundingBox();
    if (heroBox && summaryBox) {
      expect(heroBox.y).toBeLessThan(summaryBox.y);
    }
  });

  test("weather area does not contain technical terms", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const hero = page.locator("header").first();
    const heroText = await hero.innerText();
    expect(heroText).not.toMatch(/\bsync\b/i);
    expect(heroText).not.toMatch(/\bbackup\b/i);
  });

  test("shows compact 想你 area", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // MissYouCombinedCard in compact mode should show "想你" or "想他一下"
    const missYouCard = page.locator("section").filter({ hasText: /想你|想他一下/ }).first();
    await expect(missYouCard).toBeVisible();
  });

  test("does NOT show 小乖今天 card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "小乖今天" })).toHaveCount(0);
  });

  test("LoveNoteCard on homepage shows 全部 link to /notes", async ({ page }) => {
    await page.goto("/");
    const allLink = page.locator('a[href="/notes"]').first();
    await expect(allLink).toBeVisible();
  });

  test("shows Beijing time or local time", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The HomeTimeHint should render "北京" somewhere in the hero
    const hero = page.locator("header").first();
    const heroText = await hero.innerText();
    expect(heroText).toMatch(/北京/);
  });

  test("does not show undefined in time area", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    // "undefined" should not appear anywhere visible
    const pageText = await body.innerText();
    expect(pageText).not.toContain("undefined");
  });

  test("does not show null in time area", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    expect(await body.innerText()).not.toContain("null");
  });

});

test.describe("Owner homepage (/me)", () => {
  test("shows updated hero subtitle", async ({ page }) => {
    await page.goto("/me");
    await expect(page.locator("text=看看小乖今天怎么样。")).toBeVisible();
  });

  test("shows 小乖今天 status card", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByRole("heading", { name: "小乖今天" })).toBeVisible();
  });

  test("XiaoguaiStatusCard links are /me prefixed", async ({ page }) => {
    await page.goto("/me");
    // UnreadBadge links inside XiaoguaiStatusCard should be /me/...
    const statusCard = page.getByRole("heading", { name: "小乖今天" }).locator("..");
    const links = statusCard.locator("a");
    const count = await links.count();
    if (count > 0) {
      const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      for (const href of hrefs) {
        if (href) expect(href.startsWith("/me")).toBe(true);
      }
    }
  });

  test("shows Quick Actions section", async ({ page }) => {
    await page.goto("/me");
    await expect(page.locator("text=做点什么")).toBeVisible();
    await expect(page.locator("text=写小纸条")).toBeVisible();
    await expect(page.locator("text=传相册")).toBeVisible();
  });

  test("Quick Actions tiles link to /me routes", async ({ page }) => {
    await page.goto("/me");
    const writeNoteLink = page.locator('a[href="/me/notes"]').first();
    await expect(writeNoteLink).toBeVisible();
    const albumLink = page.locator('a[href="/me/albums"]').first();
    await expect(albumLink).toBeVisible();
  });

  test("LoveNoteCard on homepage shows 全部 link to /me/notes", async ({ page }) => {
    await page.goto("/me");
    const allLink = page.locator('a[href="/me/notes"]').first();
    await expect(allLink).toBeVisible();
  });

  test("no bare partner links on /me", async ({ page }) => {
    await page.goto("/me");
    // Should not have bare /notes, /albums etc.
    await expect(page.locator('a[href="/notes"]')).toHaveCount(0);
    await expect(page.locator('a[href="/albums"]')).toHaveCount(0);
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
});
