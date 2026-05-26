import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const insertMock = vi.fn();
const updateMock = vi.fn();
const getSpaceByCodeMock = vi.fn(async () => ({ id: "space-id", code: "xiaoguai520" }));

vi.mock("@/lib/api/cloud", () => ({
  getSpaceByCode: (...args: unknown[]) => getSpaceByCodeMock(...args)
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: insertMock,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: async () => ({
                data: {
                  id: "album-id",
                  space_id: "space-id",
                  type: "video",
                  is_favorite: false
                },
                error: null
              })
            }))
          }))
        }))
      })),
      update: updateMock
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

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/albums", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("album API metadata POST", () => {
  beforeEach(() => {
    insertMock.mockReset();
    updateMock.mockReset();
    getSpaceByCodeMock.mockClear();
    insertMock.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "album-id",
            space_id: "space-id",
            title: "小视频",
            type: "video",
            video_url: "https://example.com/video.mov",
            video_path: "xiaoguai520/videos/video.mov",
            file_size: 123,
            is_favorite: false,
            created_at: "2026-05-25T00:00:00.000Z"
          },
          error: null
        })
      })
    });
    updateMock.mockImplementation((patch) => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "album-id",
                space_id: "space-id",
                type: "video",
                video_url: "https://example.com/video.mov",
                video_path: "xiaoguai520/videos/video.mov",
                is_favorite: patch.is_favorite ?? false,
                deleted_at: patch.deleted_at ?? null,
                created_at: "2026-05-25T00:00:00.000Z"
              },
              error: null
            })
          })
        })
      })
    }));
  });

  it("creates album_items from JSON metadata without password", async () => {
    const { POST } = await import("@/app/api/albums/route");
    const response = await POST(postRequest({
      title: "小视频",
      type: "video",
      video_url: "https://example.com/video.mov",
      video_path: "xiaoguai520/videos/video.mov",
      file_size: 123
    }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.item.type).toBe("video");
    expect(getSpaceByCodeMock).toHaveBeenCalledWith("xiaoguai520");
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "小视频",
      type: "video",
      video_url: "https://example.com/video.mov",
      video_path: "xiaoguai520/videos/video.mov"
    }));
  });

  it("toggles favorite without password", async () => {
    const { PATCH } = await import("@/app/api/albums/route");
    const response = await PATCH(patchRequest({ id: "album-id", action: "toggle_favorite" }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: true }));
  });

  it("soft deletes without password", async () => {
    const { PATCH } = await import("@/app/api/albums/route");
    const response = await PATCH(patchRequest({ id: "album-id", action: "delete" }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.deleted).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }));
  });
});
