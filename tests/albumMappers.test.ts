import { describe, expect, it } from "vitest";
import { albumItemFromRow, albumItemToRow } from "@/lib/mappers";

describe("album mappers", () => {
  it("maps album_items snake_case to camelCase", () => {
    const item = albumItemFromRow({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Bristol walk",
      note: "Harbourside",
      taken_at: "2026-05-25T12:00:00Z",
      location: "Bristol",
      type: "live_photo",
      image_url: "https://example.com/a.jpg",
      image_path: "BRISTOL2026/images/a.jpg",
      video_url: "https://example.com/a.mov",
      video_path: "BRISTOL2026/videos/a.mov",
      file_size: 123,
      is_favorite: true,
      created_by: "admin",
      created_at: "2026-05-25T12:01:00Z",
      deleted_at: "2026-05-26T12:01:00Z"
    });

    expect(item.takenAt).toBe("2026-05-25T12:00:00Z");
    expect(item.imageUrl).toBe("https://example.com/a.jpg");
    expect(item.videoPath).toBe("BRISTOL2026/videos/a.mov");
    expect(item.fileSize).toBe(123);
    expect(item.isFavorite).toBe(true);
    expect(item.deletedAt).toBe("2026-05-26T12:01:00Z");
  });

  it("maps AlbumItem camelCase to snake_case", () => {
    const row = albumItemToRow({
      title: "Photo",
      takenAt: "2026-05-25T12:00:00Z",
      type: "photo",
      imageUrl: "https://example.com/a.jpg",
      imagePath: "BRISTOL2026/images/a.jpg",
      fileSize: 456,
      isFavorite: true,
      deletedAt: "2026-05-26T12:00:00Z"
    }, "space-id");

    expect(row.taken_at).toBe("2026-05-25T12:00:00Z");
    expect(row.image_url).toBe("https://example.com/a.jpg");
    expect(row.file_size).toBe(456);
    expect(row.is_favorite).toBe(true);
    expect(row.deleted_at).toBe("2026-05-26T12:00:00Z");
  });
});
