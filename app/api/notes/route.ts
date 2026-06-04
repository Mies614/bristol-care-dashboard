import { NextRequest, NextResponse } from "next/server";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { loveNoteFromRow, loveNoteToRow } from "@/lib/mappers";
import { getNotePatchUpdate } from "@/lib/noteActions";
import { hasNoteContent, inferNoteType, isValidAuthor, isValidDisplayStyle, normalizeDisplayStyle } from "@/lib/noteValidation";
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
  return text;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) return fail("小纸条墙未配置云端。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCode();
    const filter = request.nextUrl.searchParams.get("filter") || "all";
    const sort = request.nextUrl.searchParams.get("sort") || "pinned";
    const author = request.nextUrl.searchParams.get("author");
    const mood = request.nextUrl.searchParams.get("mood");
    const style = request.nextUrl.searchParams.get("style");
    const q = request.nextUrl.searchParams.get("q");
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const space = await getSpaceByCode(code);
    if (!space) return fail("小纸条空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);

    let query = createSupabaseServerClient()
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .lte("visible_from", new Date().toISOString());
    if (!includeInactive) query = query.eq("active", true);

    if (filter === "pinned") query = query.eq("pinned", true);
    if (["text", "image", "audio", "video", "mixed"].includes(filter)) query = query.eq("note_type", filter);
    if (filter === "me") query = query.eq("author", "me");
    if (filter === "xiaoguai") query = query.eq("author", "xiaoguai");
    if (author && isValidAuthor(author)) query = query.eq("author", author);
    if (mood) query = query.eq("mood", mood);
    if (style && isValidDisplayStyle(style)) query = query.eq("display_style", style);
    if (q) query = query.or(`content.ilike.%${q}%,mood.ilike.%${q}%,author.ilike.%${q}%`);

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
    const author = String(body.author || body.identity || "xiaoguai");
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

export async function PATCH(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("小纸条墙未配置云端。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const code = String(body.code || getDefaultSpaceCode());
    if (!body.id) return fail("缺少小纸条 id。", "NOTE_ID_MISSING", "validate_id", 400);
    const action = String(body.action || "update");
    if (!["update", "toggle_pinned", "set_pinned", "set_active", "delete", "soft_delete", "change_style", "change_mood"].includes(action)) {
      return fail("不支持的小纸条操作。", "INVALID_ACTION", "validate_action", 400);
    }
    if (("display_style" in body || action === "change_style") && body.display_style !== undefined && !isValidDisplayStyle(body.display_style)) {
      return fail("展示样式不正确。", "INVALID_DISPLAY_STYLE", "validate_display_style", 400);
    }

    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("小纸条空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);
    const supabase = createSupabaseServerClient();
    const { data: current, error: findError } = await supabase
      .from("love_notes")
      .select("id, active, pinned, deleted_at")
      .eq("id", String(body.id))
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (findError) return fail("小纸条查询失败。", "NOTE_PATCH_FAILED", "find_note", 500, findError);
    if (!current) return fail("没有找到这张小纸条。", "NOTE_NOT_FOUND", "find_note", 404);

    step = action === "delete" || action === "soft_delete" ? "delete_note" : "update_note";
    const safeBody = { ...body };
    delete safeBody.author;
    const patch = getNotePatchUpdate({ action, body: safeBody, current });
    const { data, error } = await supabase
      .from("love_notes")
      .update(patch)
      .eq("id", String(body.id))
      .eq("space_id", space.id)
      .select("*")
      .single();
    if (error) {
      const deleteAction = action === "delete" || action === "soft_delete";
      return fail(deleteAction ? "小纸条删除失败。" : "小纸条更新失败。", deleteAction ? "NOTE_DELETE_FAILED" : "NOTE_UPDATE_FAILED", step, 500, error);
    }
    return NextResponse.json({ ok: true, note: loveNoteFromRow(data), deleted: action === "delete" || action === "soft_delete" });
  } catch (error) {
    return fail("小纸条更新请求失败。", "NOTE_PATCH_FAILED", step, 500, error);
  }
}
