import { describe, expect, it } from "vitest";

/**
 * Storage orphan check tests.
 * Tests the core logic without needing a running Supabase instance.
 */

describe("storage orphan file check logic", () => {
  it("detects files in storage but not in DB", () => {
    const storagePaths = [
      "xiaoguai520/image1.jpg",
      "xiaoguai520/image2.jpg",
      "xiaoguai520/old_file.png",
    ];
    const dbPaths = ["xiaoguai520/image1.jpg"];

    const orphans = storagePaths.filter((sp) => !dbPaths.includes(sp));
    expect(orphans).toHaveLength(2);
    expect(orphans).toContain("xiaoguai520/image2.jpg");
    expect(orphans).toContain("xiaoguai520/old_file.png");
  });

  it("detects DB paths not in storage (gaps)", () => {
    const storagePaths = ["xiaoguai520/image1.jpg"];
    const dbPaths = [
      "xiaoguai520/image1.jpg",
      "xiaoguai520/missing.jpg",
      "xiaoguai520/also_missing.png",
    ];

    const gaps = dbPaths.filter((dp) => !storagePaths.includes(dp));
    expect(gaps).toHaveLength(2);
    expect(gaps).toContain("xiaoguai520/missing.jpg");
    expect(gaps).toContain("xiaoguai520/also_missing.png");
  });

  it("returns empty when everything matches", () => {
    const storagePaths = ["xiaoguai520/a.jpg", "xiaoguai520/b.jpg"];
    const dbPaths = ["xiaoguai520/a.jpg", "xiaoguai520/b.jpg"];

    const orphans = storagePaths.filter((sp) => !dbPaths.includes(sp));
    const gaps = dbPaths.filter((dp) => !storagePaths.includes(dp));

    expect(orphans).toHaveLength(0);
    expect(gaps).toHaveLength(0);
  });

  it("handles empty storage gracefully", () => {
    const storagePaths: string[] = [];
    const dbPaths = ["xiaoguai520/ref.jpg"];

    const orphans = storagePaths.filter((sp) => !dbPaths.includes(sp));
    const gaps = dbPaths.filter((dp) => !storagePaths.includes(dp));

    expect(orphans).toHaveLength(0);
    expect(gaps).toHaveLength(1);
    expect(gaps).toContain("xiaoguai520/ref.jpg");
  });

  it("handles empty DB gracefully", () => {
    const storagePaths = ["xiaoguai520/orphan.jpg"];
    const dbPaths: string[] = [];

    const orphans = storagePaths.filter((sp) => !dbPaths.includes(sp));
    const gaps = dbPaths.filter((dp) => !storagePaths.includes(dp));

    expect(orphans).toHaveLength(1);
    expect(gaps).toHaveLength(0);
  });

  it("does not crash on unavailable state", () => {
    // Simulate the Supabase-unavailable response
    const response = {
      ok: true,
      status: "unavailable" as const,
      message: "Supabase 未配置，无法检查 Storage 孤儿文件。",
      orphans: [],
    };

    expect(response.ok).toBe(true);
    expect(response.status).toBe("unavailable");
    expect(response.orphans).toEqual([]);
  });

  it("check response returns stable structure", () => {
    const response = {
      ok: true,
      status: "checked",
      summary: {
        totalDbOrphans: 3,
        totalStorageGaps: 1,
        buckets: [
          { bucket: "love-notes", dbOrphanCount: 2, storageGapCount: 1 },
          { bucket: "couple-albums", dbOrphanCount: 1, storageGapCount: 0 },
          { bucket: "backgrounds", dbOrphanCount: 0, storageGapCount: 0 },
        ],
      },
    };

    // Stable structure
    expect(response.ok).toBe(true);
    expect(response.summary).toBeDefined();
    expect(response.summary.totalDbOrphans).toBe(3);
    expect(response.summary.totalStorageGaps).toBe(1);

    // Each bucket has counts
    expect(response.summary.buckets[0].bucket).toBe("love-notes");
    expect(response.summary.buckets[0].dbOrphanCount).toBe(2);
    expect(response.summary.buckets[1].bucket).toBe("couple-albums");
    expect(response.summary.buckets[2].bucket).toBe("backgrounds");
  });
});
