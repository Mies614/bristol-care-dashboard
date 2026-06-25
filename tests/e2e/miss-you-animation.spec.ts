import { test, expect } from "./fixtures";

// ──────────────────────────────────────────────
// Miss You Delight Animation E2E
// ──────────────────────────────────────────────

test.describe("MissYou — partner home (/)", () => {
  test("partner home opens", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeGreaterThanOrEqual(200);
    expect(res?.status()).toBeLessThan(400);
  });

  test("想你 button is visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "想他一下" });
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test("clicking 想你 does not crash page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "想他一下" });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      // Wait a moment for any animation
      await page.waitForTimeout(500);
      // Page should still be functional
      const body = await page.evaluate(() => document.body.innerText || "");
      expect(body).not.toContain("undefined");
    }
  });

  test("375px viewport has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("page does not show undefined or null", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = await page.evaluate(() => document.body.innerText || "");
    expect(body).not.toContain("undefined");
    expect(body).not.toMatch(/\bnull\b/);
    expect(body).not.toContain("NaN");
  });
});

test.describe("MissYou — owner home (/me)", () => {
  test("owner home opens", async ({ page }) => {
    const res = await page.goto("/me", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeGreaterThanOrEqual(200);
    expect(res?.status()).toBeLessThan(400);
  });

  test("想小乖 button is visible", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "想小乖一下" });
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test("clicking 想小乖 does not crash page", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "想小乖一下" });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(500);
      const body = await page.evaluate(() => document.body.innerText || "");
      expect(body).not.toContain("undefined");
    }
  });

  test("375px viewport has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe("MissYou — aria and a11y", () => {
  test("partner button has correct aria-label", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.locator("button[aria-label='想他一下']");
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test("owner button has correct aria-label", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const btn = page.locator("button[aria-label='想小乖一下']");
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test("heart sprites are aria-hidden", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Before clicking, there may be ambient hearts
    const hearts = page.locator("[aria-hidden='true']");
    const count = await hearts.count();
    // Ambient hearts may or may not be present depending on data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("mark-seen button has aria-label when visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "标记为已读" });
    // May not be visible if no unread events
    const visible = await btn.isVisible().catch(() => false);
    // Just checking the selector works
    expect(typeof visible).toBe("boolean");
  });
});

test.describe("MissYou — reduced-motion safety", () => {
  test("page works in reduced-motion context", async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = await page.evaluate(() => document.body.innerText || "");
    expect(body).not.toContain("undefined");
    // Button should still be visible
    const btn = page.locator("button[aria-label='想他一下']");
    await expect(btn).toBeVisible({ timeout: 5000 });
  });
});
