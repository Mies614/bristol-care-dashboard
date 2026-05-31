import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeSpaceCode } from "@/lib/spaceCode";
import { normalizeSettingValue } from "@/lib/supabase/settings";

describe("server-safe Supabase helpers", () => {
  it("defaults an empty space code to xiaoguai520", () => {
    expect(normalizeSpaceCode(undefined)).toBe("xiaoguai520");
  });

  it("queries couple_spaces rather than the retired spaces table", () => {
    const source = readFileSync(new URL("../lib/supabase/spaces.ts", import.meta.url), "utf8");
    expect(source).toContain('.from("couple_spaces")');
    expect(source).not.toContain('.from("spaces")');
  });

  it("normalizes null settings values", () => {
    expect(normalizeSettingValue("app_settings", null)).toEqual({});
  });

  it("strips local background image data before cloud storage", () => {
    expect(normalizeSettingValue("background_settings", {
      mode: "image",
      imageDataUrl: "data:image/png;base64,abc"
    })).not.toHaveProperty("imageDataUrl");
  });

  it("fills missing theme fields with defaults", () => {
    expect(normalizeSettingValue("theme_settings", {})).toMatchObject({
      style: "soft",
      cardStyle: "glass",
      navStyle: "glass",
      radius: "extra",
      decoration: "stars"
    });
  });
});
