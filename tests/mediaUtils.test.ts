import { describe, expect, it } from "vitest";
import { cleanupVideoElement } from "@/lib/media-utils";

describe("cleanupVideoElement", () => {
  it("handles null safely", () => {
    expect(() => cleanupVideoElement(null)).not.toThrow();
    expect(() => cleanupVideoElement(undefined as unknown as null)).not.toThrow();
  });

  it("calls pause, removeAttribute, and load on a video element", () => {
    const pause = vi.fn();
    const removeAttribute = vi.fn();
    const load = vi.fn();
    const video = { pause, removeAttribute, load } as unknown as HTMLVideoElement;

    cleanupVideoElement(video);

    expect(pause).toHaveBeenCalledOnce();
    expect(removeAttribute).toHaveBeenCalledWith("src");
    expect(load).toHaveBeenCalledOnce();
  });
});