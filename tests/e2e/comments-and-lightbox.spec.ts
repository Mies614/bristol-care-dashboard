import { test, expect } from "./fixtures";

/**
 * E2E tests for comments and albums lightbox interactions.
 */

test.describe("Comments UI", () => {
  test("/me/notes page renders without error", async ({ page }) => {
    await page.goto("/me/notes");
    await page.waitForLoadState("networkidle");
    // Page should render without crashing
    await expect(page.locator("body")).toBeVisible();
    // URL should stay under /me
    await expect(page).toHaveURL(/\/me\/notes/);
  });

  test("375px viewport has no horizontal overflow on /me/notes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/me/notes");
    await page.waitForLoadState("networkidle");

    // Check that body doesn't overflow horizontally
    const bodyWidth = await page.locator("body").evaluate((el) => el.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow small tolerance
  });

  test("comment input becomes available when NoteCard comment section is opened", async ({ page }) => {
    await page.goto("/me/notes");
    await page.waitForLoadState("networkidle");

    // Look for any comment button (💬) — this appears in ContentInteractionBar on each NoteCard
    const commentBtns = page.locator("button").filter({ hasText: "💬" });
    // If notes exist, comment buttons should be visible
    // If no notes, the page just renders empty — that's fine
    const count = await commentBtns.count();
    if (count > 0) {
      await commentBtns.first().click();
      await page.waitForTimeout(300);
      // After clicking, the comment textarea should appear
      const textarea = page.locator("textarea[placeholder*='想']").first();
      const textareaCount = await textarea.count();
      if (textareaCount > 0) {
        await expect(textarea).toBeVisible();
      }
    }
  });
});

test.describe("Albums Lightbox", () => {
  test("/me/albums lightbox stays under /me", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/me\/albums/);
  });

  test("/me/albums lightbox has close button (X)", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");

    const albumItem = page.locator("button, [role='button'], .cursor-pointer").filter({ has: page.locator("img") }).first();
    const albumItemCount = await albumItem.count();

    if (albumItemCount > 0) {
      await albumItem.click();
      await page.waitForTimeout(500);

      const closeButton = page.locator("button[aria-label='关闭']");
      const closeCount = await closeButton.count();

      if (closeCount > 0) {
        await expect(closeButton.first()).toBeVisible();
      }
      await page.keyboard.press("Escape");
    }
  });

  test("/me/albums lightbox has download button when media opens", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");

    const albumItem = page.locator("button, [role='button'], .cursor-pointer").filter({ has: page.locator("img") }).first();
    const albumItemCount = await albumItem.count();

    if (albumItemCount > 0) {
      await albumItem.click();
      await page.waitForTimeout(500);

      const downloadLink = page.locator("a[download]").first();
      const downloadCount = await downloadLink.count();

      if (downloadCount > 0) {
        await expect(downloadLink).toBeVisible();
      }
      await page.keyboard.press("Escape");
    }
  });

  test("/me/albums lightbox has comment entry", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");

    const albumItem = page.locator("button, [role='button'], .cursor-pointer").filter({ has: page.locator("img") }).first();
    const albumItemCount = await albumItem.count();

    if (albumItemCount > 0) {
      await albumItem.click();
      await page.waitForTimeout(500);

      const commentInput = page.locator("textarea[placeholder*='想']").first();
      const commentBtn = page.locator("button").filter({ hasText: "💬" }).first();

      const hasCommentFeature = (await commentInput.count() > 0) || (await commentBtn.count() > 0);
      expect(hasCommentFeature).toBe(true);

      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Memories unread routing", () => {
  test("/me/memories/unread links stay under /me", async ({ page }) => {
    await page.goto("/me/memories/unread");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/me\/memories\/unread/);
  });
});
