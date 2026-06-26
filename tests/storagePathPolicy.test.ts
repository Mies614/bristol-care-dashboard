import { describe, expect, it } from "vitest";
import { buildImmutableStoragePath, isImmutableStoragePath } from "@/lib/storagePathPolicy";

describe("storage path policy", () => {
  it("builds immutable UUID paths with space, identity, date, and kind", () => {
    const path = buildImmutableStoragePath({
      spaceCode: "xiaoguai520",
      identity: "me",
      kind: "images",
      extension: "webp",
      now: new Date("2026-06-26T12:00:00Z"),
      uuid: "123e4567-e89b-12d3-a456-426614174000",
    });

    expect(path).toBe("xiaoguai520/me/2026/06/images/123e4567-e89b-12d3-a456-426614174000.webp");
    expect(isImmutableStoragePath(path)).toBe(true);
  });

  it("rejects traversal in path parts", () => {
    expect(() =>
      buildImmutableStoragePath({
        spaceCode: "../other",
        kind: "images",
        extension: "webp",
        uuid: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).toThrow(/路径片段不安全/);
  });

  it("rejects non-UUID fixed file names", () => {
    expect(isImmutableStoragePath("xiaoguai520/me/2026/06/images/avatar.webp")).toBe(false);
  });
});
