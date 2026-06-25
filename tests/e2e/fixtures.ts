/**
 * Shared E2E fixtures with Supabase Storage intercept.
 *
 * To use in a spec file, replace:
 *   import { test, expect } from "@playwright/test";
 * with:
 *   import { test, expect } from "./fixtures";
 *
 * The storage intercept prevents real Supabase Storage media downloads
 * during E2E runs, saving egress bandwidth.
 */
import { test as base, expect } from "@playwright/test";
import { interceptSupabaseStorage } from "./utils/storage-intercept";

export const test = base.extend({
  /* eslint-disable react-hooks/rules-of-hooks */
  page: async ({ page }, use) => {
    await interceptSupabaseStorage(page);
    await use(page);
  },
  /* eslint-enable react-hooks/rules-of-hooks */
});

export { expect };
