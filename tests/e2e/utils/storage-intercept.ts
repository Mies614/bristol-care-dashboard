/**
 * Supabase Storage Egress Guard for E2E tests.
 *
 * Intercepts all requests to Supabase Storage public URLs and returns a tiny
 * placeholder or 204, preventing real media downloads from consuming egress.
 *
 * Usage in E2E spec:
 *   import { interceptSupabaseStorage } from "./utils/storage-intercept";
 *   test.beforeEach(async ({ page }) => {
 *     await interceptSupabaseStorage(page);
 *   });
 */

// Match Supabase Storage public URLs (any project)
const SUPABASE_STORAGE_PATTERN =
  /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//i;

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>';

/**
 * Intercept all Supabase Storage requests and return a tiny placeholder.
 * - Images: returns a 1x1 transparent SVG with long cache headers
 * - Videos/Audio/Other: returns 204 No Content (prevents download)
 */
export async function interceptSupabaseStorage(page: import("@playwright/test").Page) {
  await page.route(SUPABASE_STORAGE_PATTERN, async (route) => {
    const url = route.request().url();
    const isImage = /\.(png|jpe?g|gif|webp|svg|heic|heif)(\?|$)/i.test(url);

    if (isImage) {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
        body: PLACEHOLDER_SVG,
      });
    } else {
      await route.fulfill({
        status: 204,
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
  });
}
