import { NextRequest, NextResponse } from "next/server";
import { albumItemFromRow, albumItemToRow } from "@/lib/mappers";
import { getSpaceByCode } from "@/lib/api/cloud";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { AlbumItem } from "@/lib/types";

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

function validatePassword(password: unknown) {
  if (!password) return fail("缺少后台密码，请重新登录。", "ADMIN_PASSWORD_MISSING", "validate_admin_password", 401);
  if (String(password) !== process.env.ADMIN_PASSWORD) return fail("后台密码不正确。", "INVALID_ADMIN_PASSWORD", "validate_admin_password", 401);
  return null;
}

function isAlbumType(value: unknown): value is AlbumItem["type"] {
  return value === "photo" || value === "live_photo" || value === "video";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) return fail("云相册未配置，当前无法读取。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const code = request.nextUrl.searchParams.get("code") || process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "BRISTOL2026";
    const filter = request.nextUrl.searchParams.get("filter") || "all";
    const space = await getSpaceByCode(code);
    if (!space) return fail("访问码不存在。", "SPACE_NOT_FOUND", "get_space", 404);
    let query = createSupabaseServerClient()
      .from("album_items")
      .select("*")
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (filter === "favorite") query = query.eq("is_favorite", true);
    if (["photo", "live_photo", "video"].includes(filter)) query = query.eq("type", filter);
    const { data, error } = await query;
    if (error) return fail("相册读取失败。", "ALBUM_LIST_FAILED", "list_album_items", 500, error);
    return NextResponse.json({ ok: true, items: (data || []).map(albumItemFromRow) });
  } catch (error) {
    return fail("相册读取请求失败。", "ALBUM_GET_FAILED", "get_album_items", 500, error);
  }
}

export async function POST(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("云相册未配置，当前无法保存。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const passwordError = validatePassword(body.password);
    if (passwordError) return passwordError;
    const code = String(body.code || process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "BRISTOL2026");

    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("访问码不存在。", "SPACE_NOT_FOUND", "get_space", 404);

    step = "validate_metadata";
    if (!isAlbumType(body.type)) return fail("相册类型不正确。", "ALBUM_TYPE_INVALID", "validate_metadata", 400);
    const hasImage = Boolean(optionalString(body.image_url) && optionalString(body.image_path));
    const hasVideo = Boolean(optionalString(body.video_url) && optionalString(body.video_path));
    if (!hasImage && !hasVideo) return fail("请至少提供图片或视频的 Storage URL。", "ALBUM_MEDIA_MISSING", "validate_metadata", 400);
    if (body.type === "photo" && !hasImage) return fail("照片项目缺少图片。", "ALBUM_IMAGE_METADATA_MISSING", "validate_metadata", 400);
    if (body.type === "video" && !hasVideo) return fail("视频项目缺少视频。", "ALBUM_VIDEO_METADATA_MISSING", "validate_metadata", 400);
    if (body.type === "live_photo" && (!hasImage || !hasVideo)) return fail("实况照片需要同时包含封面图片和视频。", "ALBUM_LIVE_METADATA_MISSING", "validate_metadata", 400);

    step = "insert_album_item";
    const item = {
      title: optionalString(body.title),
      note: optionalString(body.note),
      takenAt: optionalString(body.taken_at),
      location: optionalString(body.location),
      type: body.type,
      imageUrl: optionalString(body.image_url),
      imagePath: optionalString(body.image_path),
      videoUrl: optionalString(body.video_url),
      videoPath: optionalString(body.video_path),
      fileSize: optionalNumber(body.file_size),
      isFavorite: Boolean(body.is_favorite),
      createdBy: "admin"
    };
    const row = albumItemToRow(item, space.id);
    const { data, error } = await createSupabaseServerClient()
      .from("album_items")
      .insert(row as never)
      .select("*")
      .single();
    if (error) return fail("相册保存失败。", "ALBUM_INSERT_FAILED", "insert_album_item", 500, error);
    return NextResponse.json({ ok: true, item: albumItemFromRow(data) });
  } catch (error) {
    return fail("相册保存请求失败。", "ALBUM_CREATE_FAILED", step, 500, error);
  }
}

export async function PATCH(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("云相册未配置，当前无法更新。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const passwordError = validatePassword(body.password);
    if (passwordError) return passwordError;
    const code = String(body.code || process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "BRISTOL2026");
    if (!body.id) return fail("缺少相册项目 ID。", "ALBUM_ID_MISSING", "validate_album_id", 400);
    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("访问码不存在。", "SPACE_NOT_FOUND", "get_space", 404);

    const supabase = createSupabaseServerClient();
    const { data: current, error: currentError } = await supabase
      .from("album_items")
      .select("*")
      .eq("space_id", space.id)
      .eq("id", String(body.id))
      .is("deleted_at", null)
      .maybeSingle();
    if (currentError) return fail("相册项目查询失败。", "ALBUM_LOOKUP_FAILED", "lookup_album_item", 500, currentError);
    if (!current) return fail("相册项目不存在。", "ALBUM_NOT_FOUND", "lookup_album_item", 404);

    step = "update_album_item";
    const action = String(body.action || "update");
    const patch: Record<string, unknown> = {};
    if (action === "delete") {
      patch.deleted_at = new Date().toISOString();
    } else if (action === "toggle_favorite") {
      patch.is_favorite = !current.is_favorite;
    } else {
      if ("title" in body) patch.title = body.title || null;
      if ("note" in body) patch.note = body.note || null;
      if ("taken_at" in body) patch.taken_at = body.taken_at || null;
      if ("location" in body) patch.location = body.location || null;
      if ("is_favorite" in body) patch.is_favorite = Boolean(body.is_favorite);
    }
    const { data, error } = await supabase
      .from("album_items")
      .update(patch)
      .eq("space_id", space.id)
      .eq("id", String(body.id))
      .select("*")
      .single();
    if (error) return fail("相册项目更新失败。", "ALBUM_UPDATE_FAILED", "update_album_item", 500, error);
    return NextResponse.json({ ok: true, item: albumItemFromRow(data), deleted: action === "delete" });
  } catch (error) {
    return fail("相册更新请求失败。", "ALBUM_PATCH_FAILED", step, 500, error);
  }
}
