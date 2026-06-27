import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const updateMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/api/cloud", () => ({
  getDefaultSpaceCode: () => "xiaoguai520",
  getSpaceByCode: vi.fn(async () => ({ id: "space-id", code: "xiaoguai520" }))
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: async () => ({ data: { id: "note-id", active: true, pinned: false }, error: null })
            })
          })
        })
      }),
      insert: insertMock,
      update: updateMock
    }))
  }))
}));

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/notes", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      Referer: "http://localhost:3000/notes",
    },
    body: JSON.stringify(body)
  });
}

describe("notes API", () => {
  beforeEach(() => {
    updateMock.mockReset();
    insertMock.mockReset();
    insertMock.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "note-id",
            content: "hello",
            active: true,
            pinned: false,
            author: "xiaoguai",
            note_type: "text",
            display_style: "sticky",
            created_by: "xiaoguai"
          },
          error: null
        })
      })
    });
    updateMock.mockReturnValue({
      eq: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "note-id",
                content: "updated",
                active: true,
                pinned: false,
                author: "me",
                note_type: "text",
                display_style: "minimal"
              },
              error: null
            })
          })
        })
      })
    });
  });

  it("PATCH does not require password", async () => {
    const { PATCH } = await import("@/app/api/notes/route");
    const response = await PATCH(patchRequest({ id: "note-id", action: "update", content: "updated" }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ content: "updated" }));
  });

  it("POST derives the owner author from /me context", async () => {
    const { POST } = await import("@/app/api/notes/route");
    const request = new NextRequest("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/me/notes",
      },
      body: JSON.stringify({ content: "hello", author: "me" })
    });
    const response = await POST(request);
    void (await response.json());
    expect(response.status).toBe(200);
    // The mock response is hardcoded, but we verify the insert was called with the correct author
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      author: "me",
      created_by: "me"
    }));
  });

  it("POST defaults to xiaoguai when no author is provided", async () => {
    const { POST } = await import("@/app/api/notes/route");
    const request = new NextRequest("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/notes",
      },
      body: JSON.stringify({ content: "hello" })
    });
    const response = await POST(request);
    void (await response.json());
    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      author: "xiaoguai",
      created_by: "xiaoguai"
    }));
  });
});


describe("NoteMediaDownload comprehensive", () => {
  it("getNoteMediaDownloadUrl returns imagePath when imageUrl is null", async () => {
    const { getNoteMediaDownloadUrl } = await import("@/lib/notesMedia");
    const result = getNoteMediaDownloadUrl({
      imagePath: "xiaoguai520/me/2026/test.jpg",
      imageUrl: undefined,
    } as unknown as import("@/lib/types").LoveNote);
    expect(result).toBe("xiaoguai520/me/2026/test.jpg");
  });

  it("hasNoteDownloadableMedia returns true for imagePath with null imageUrl", async () => {
    const { hasNoteDownloadableMedia } = await import("@/lib/notesMedia");
    const result = hasNoteDownloadableMedia({
      imagePath: "xiaoguai520/me/2026/test.jpg",
      imageUrl: undefined,
    } as unknown as import("@/lib/types").LoveNote);
    expect(result).toBe(true);
  });

  it("hasNoteDownloadableMedia returns true for mixed note with imagePath", async () => {
    const { hasNoteDownloadableMedia } = await import("@/lib/notesMedia");
    const result = hasNoteDownloadableMedia({
      type: "mixed",
      imagePath: "xiaoguai520/me/2026/test.jpg",
      imageUrl: undefined,
    } as unknown as import("@/lib/types").LoveNote);
    expect(result).toBe(true);
  });

  it("hasNoteDownloadableMedia returns false for text-only note", async () => {
    const { hasNoteDownloadableMedia } = await import("@/lib/notesMedia");
    const result = hasNoteDownloadableMedia({
      content: "hello",
      imagePath: undefined,
      videoPath: undefined,
      audioPath: undefined,
    } as unknown as import("@/lib/types").LoveNote);
    expect(result).toBe(false);
  });

  it("getNoteMediaDownloadUrl returns videoPath over imagePath", async () => {
    const { getNoteMediaDownloadUrl } = await import("@/lib/notesMedia");
    const result = getNoteMediaDownloadUrl({
      imagePath: "test-img.jpg",
      videoPath: "test-video.mp4",
    } as unknown as import("@/lib/types").LoveNote);
    expect(result).toBe("test-video.mp4");
  });

  it("getAlbumMediaDownloadUrl returns imagePath (not legacy imageUrl)", async () => {
    const { getAlbumMediaDownloadUrl } = await import("@/lib/notesMedia");
    const result = getAlbumMediaDownloadUrl({
      imagePath: "album/path/img.jpg",
      imageUrl: undefined,
    } as unknown as import("@/lib/types").AlbumItem);
    expect(result).toBe("album/path/img.jpg");
  });
});
