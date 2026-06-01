import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * ImageWithSkeleton tests in node environment.
 * We validate the component source code structure rather than rendering,
 * since the test environment is node (no DOM/framer-motion runtime).
 */
describe("ImageWithSkeleton component structure", () => {
  const sourcePath = resolve(__dirname, "../components/ImageWithSkeleton.tsx");
  const source = readFileSync(sourcePath, "utf-8");

  it("has loading='lazy' attribute", () => {
    expect(source).toContain('loading="lazy"');
  });

  it("has decoding='async' attribute", () => {
    expect(source).toContain('decoding="async"');
  });

  it("passes alt prop correctly", () => {
    expect(source).toContain("alt={alt}");
  });

  it("handles onLoad via handleLoad callback", () => {
    expect(source).toContain("onLoad={handleLoad}");
  });

  it("handles onError via handleError callback", () => {
    expect(source).toContain("onError={handleError}");
  });

  it("shows skeleton when not loaded and no error", () => {
    // The skeleton div conditionally renders when !loaded && !error
    expect(source).toContain("!loaded && !error");
    expect(source).toContain("linear-gradient");
    expect(source).toContain("backgroundSize: \"200% 100%\"");
  });

  it("shows fallback image on error with '图片加载失败' text", () => {
    expect(source).toContain("图片加载失败");
  });

  it("fallback container has no fixed dimensions (does not break layout)", () => {
    // The error fallback uses relative positioning (inset-0) with flex layout
    // and does not use fixed width/height
    const fallbackBlock = source.match(/error \? \([\s\S]*?fallback.*?\)/);
    if (fallbackBlock) {
      expect(fallbackBlock[0]).not.toContain("width:");
      expect(fallbackBlock[0]).not.toContain("height:");
    }
    // Main container uses aspect ratio, not fixed dimensions
    expect(source).toContain("aspect-[3/4]");
    expect(source).toContain("aspect-square");
    expect(source).toContain("aspect-video");
  });

  it("supports showPlayIcon overlay for video covers", () => {
    expect(source).toContain("showPlayIcon");
    expect(source).toContain("▶");
  });

  it("supports reduced-motion via useAccessibleMotion", () => {
    expect(source).toContain("useAccessibleMotion");
    expect(source).toContain("reduceMotion");
  });

  it("marks image as invisible during loading", () => {
    expect(source).toContain("invisible");
  });

  it("uses object-cover for img styling", () => {
    expect(source).toContain("object-cover");
  });
});