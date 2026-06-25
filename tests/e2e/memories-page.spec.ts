import { test, expect } from "./fixtures";

const SHARED_ACCESS_KEY = "bristol_dashboard_shared_access";

test.describe("Partner memories page (/memories)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("page loads and shows 回忆", async ({ page }) => {
    await page.goto("/memories");
    await expect(page.locator("h1")).toContainText("回忆");
  });

  test("shows subtitle 把一起留下的小片段", async ({ page }) => {
    await page.goto("/memories");
    await expect(page.locator("text=把一起留下的小片段，慢慢翻一遍。")).toBeVisible();
  });

  test("has 未读回忆 link", async ({ page }) => {
    await page.goto("/memories");
    await expect(page.locator("text=未读回忆")).toBeVisible();
  });

  test("does NOT show admin/管理中心", async ({ page }) => {
    await page.goto("/memories");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/管理中心/);
  });

  test("does not show undefined/null", async ({ page }) => {
    await page.goto("/memories");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });
});

test.describe("Owner memories page (/me/memories)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("page loads and shows 我的回忆", async ({ page }) => {
    await page.goto("/me/memories");
    await expect(page.locator("h1")).toContainText("我的回忆");
  });

  test("shows subtitle 整理给小乖", async ({ page }) => {
    await page.goto("/me/memories");
    await expect(page.locator("text=整理给小乖看的照片、小纸条和片段。")).toBeVisible();
  });

  test("no bare partner links", async ({ page }) => {
    await page.goto("/me/memories");
    const nav = page.locator("nav[aria-label='main navigation']");
    if (await nav.isVisible()) {
      const hrefs = await nav.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      expect(hrefs).not.toContain("/memories");
    }
  });

  test("does NOT show admin/管理中心", async ({ page }) => {
    await page.goto("/me/memories");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/管理中心/);
  });
});

test.describe("Unread memories pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("/memories/unread loads and shows title", async ({ page }) => {
    await page.goto("/memories/unread");
    await expect(page.locator("h1")).toContainText("新的回忆");
  });

  test("/me/memories/unread loads and shows title", async ({ page }) => {
    await page.goto("/me/memories/unread");
    await expect(page.locator("h1")).toContainText("小乖还没看的");
  });

  test("/memories/unread has return link", async ({ page }) => {
    await page.goto("/memories/unread");
    await page.waitForLoadState("networkidle");
    // Should have a "返回回忆" button or link
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/返回/);
  });

  test("/me/memories/unread shows empty state", async ({ page }) => {
    await page.goto("/me/memories/unread");
    await page.waitForLoadState("networkidle");
    // Should render without error - either content or empty state
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Responsive — 375px viewport on memories", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  const mobileViewport = { width: 375, height: 812 };

  test("/memories no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/memories");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me/memories no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/memories");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/memories/unread no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/memories/unread");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me/memories/unread no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/memories/unread");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
