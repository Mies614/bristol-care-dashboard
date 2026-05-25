import { NextRequest, NextResponse } from "next/server";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { loveNoteFromRow, loveNoteToRow } from "@/lib/mappers";
import { hasNoteContent, inferNoteType, normalizeDisplayStyle, normalizeNoteAuthor } from "@/lib/noteValidation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { LoveNote } from "@/lib/types";

type ApiError = {
  ok: false;
  error: string;
  code: string;
  step: string;
  detail?: string;
};

function developmentDetail(error: unknown) {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return error instanceof Error ? error.message : undefined;
}

function fail(error: string, code: string, step: string, status = 500, errorObject?: unknown) {
  return NextResponse.json<ApiError>({ ok: false, error, code, step, detail: developmentDetail(errorObject) }, { status });
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalMood(value: unknown): LoveNote["mood"] | undefined {
  const text = optionalString(value);
  return ["开心", "想你", "累了", "记录一下", "加油", "今日小事"].includes(text || "") ? text as LoveNote["mood"] : undefined;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) return fail("小纸条墙未配置云端。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCode();
    const filter = request.nextUrl.searchParams.get("filter") || "all";
    const sort = request.nextUrl.searchParams.get("sort") || "pinned";
    const space = await getSpaceByCode(code);
    if (!space) return fail("小纸条空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);

    let query = createSupabaseServerClient()
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .eq("active", true)
      .is("deleted_at", null)
      .lte("visible_from", new Date().toISOString());

    if (filter === "pinned") query = query.eq("pinned", true);
    if (["text", "image", "audio", "video", "mixed"].includes(filter)) query = query.eq("note_type", filter);
    if (filter === "me") query = query.eq("author", "me");
    if (filter === "xiaoguai") query = query.eq("author", "xiaoguai");

    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else {
      if (sort === "pinned") query = query.order("pinned", { ascending: false });
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) return fail("小纸条墙读取失败。", "NOTES_LIST_FAILED", "list_notes", 500, error);
    return NextResponse.json({ ok: true, notes: (data || []).map(loveNoteFromRow) });
  } catch (error) {
    return fail("小纸条墙请求失败。", "NOTES_GET_FAILED", "get_notes", 500, error);
  }
}

export async function POST(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("小纸条墙未配置云端。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const code = String(body.code || getDefaultSpaceCode());
    const content = optionalString(body.content) || "";
    const imageUrl = optionalString(body.image_url);
    const audioUrl = optionalString(body.audio_url);
    const videoUrl = optionalString(body.video_url);
    if (!hasNoteContent({ content, imageUrl, audioUrl, videoUrl })) {
      return fail("小纸条至少需要文字、语音、图片或视频中的一种。", "NOTE_EMPTY", "validate_note", 400);
    }

    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("小纸条空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);

    step = "insert_note";
    const author = normalizeNoteAuthor(body.author);
    const note: Omit<LoveNote, "id"> = {
      content,
      active: true,
      pinned: false,
      author,
      noteType: inferNoteType({ content, imageUrl, audioUrl, videoUrl }),
      displayStyle: normalizeDisplayStyle(body.display_style),
      mood: optionalMood(body.mood),
      visibleFrom: new Date().toISOString(),
      createdBy: author,
      imageUrl,
      imagePath: optionalString(body.image_path),
      imageAlt: optionalString(body.image_alt),
      audioUrl,
      audioPath: optionalString(body.audio_path),
      videoUrl,
      videoPath: optionalString(body.video_path),
      mediaSize: typeof body.media_size === "number" && Number.isFinite(body.media_size) ? body.media_size : undefined
    };
    const { data, error } = await createSupabaseServerClient()
      .from("love_notes")
      .insert(loveNoteToRow(note, space.id) as never)
      .select("*")
      .single();
    if (error) return fail("小纸条保存失败。", "NOTE_INSERT_FAILED", "insert_note", 500, error);
    return NextResponse.json({ ok: true, note: loveNoteFromRow(data) });
  } catch (error) {
    return fail("小纸条提交失败。", "NOTE_POST_FAILED", step, 500, error);
  }
}
