import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const insertMock = vi.fn();

vi.mock("@/lib/api/cloud", () => ({
  getSpaceByCode: vi.fn(async () => ({ id: "space-id", code: "BRISTOL2026" }))
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: insertMock
    }))
  }))
}));

function postRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("album API metadata POST", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    insertMock.mockReset();
    insertMock.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "album-id",
            space_id: "space-id",
            title: "小视频",
            type: "video",
            video_url: "https://example.com/video.mov",
            video_path: "BRISTOL2026/videos/video.mov",
            file_size: 123,
            is_favorite: false,
            created_at: "2026-05-25T00:00:00.000Z"
          },
          error: null
        })
      })
    });
  });

  it("creates album_items from JSON metadata", async () => {
    const { POST } = await import("@/app/api/albums/route");
    const response = await POST(postRequest({
      password: "secret",
      code: "BRISTOL2026",
      title: "小视频",
      type: "video",
      video_url: "https://example.com/video.mov",
      video_path: "BRISTOL2026/videos/video.mov",
      file_size: 123
    }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.item.type).toBe("video");
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "小视频",
      type: "video",
      video_url: "https://example.com/video.mov",
      video_path: "BRISTOL2026/videos/video.mov"
    }));
  });

  it("returns 401 when password is missing", async () => {
    const { POST } = await import("@/app/api/albums/route");
    const response = await POST(postRequest({
      code: "BRISTOL2026",
      type: "video",
      video_url: "https://example.com/video.mov",
      video_path: "BRISTOL2026/videos/video.mov"
    }));
    const payload = await response.json();
    expect(response.status).toBe(401);
    expect(payload.code).toBe("ADMIN_PASSWORD_MISSING");
  });
});
