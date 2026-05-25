import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { getImageExtension, validateImageFile } from "@/lib/imageValidation";
import { getLoveNotePatchUpdate, shouldResetOtherPinnedNotes, type LoveNotePatchAction } from "@/lib/loveNoteActions";
import { loveNoteFromRow } from "@/lib/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "love-notes";

function adminPasswordMissingResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "缺少后台密码，请重新登录。",
      code: "ADMIN_PASSWORD_MISSING",
      step: "validate_admin_password"
    },
    { status: 401 }
  );
}

function invalidAdminPasswordResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "后台密码不正确。",
      code: "INVALID_ADMIN_PASSWORD",
      step: "validate_admin_password"
    },
    { status: 401 }
  );
}

function validatePasswordValue(password: unknown) {
  if (typeof password !== "string" || !password) return "missing";
  return validateAdminPassword(password) ? "valid" : "invalid";
}

function adminAuthResponse(password: unknown) {
  const status = validatePasswordValue(password);
  if (status === "missing") return adminPasswordMissingResponse();
  if (status === "invalid") return invalidAdminPasswordResponse();
  return null;
}

function makeImagePath(code: string, mimeType: string) {
  const random = crypto.randomUUID().slice(0, 8);
  return `${code}/${Date.now()}-${random}.${getImageExtension(mimeType)}`;
}

function developmentDetail(error: { message?: string; details?: string | null; hint?: string | null }) {
  if (process.env.NODE_ENV !== "development") return undefined;
  return [error.message, error.details, error.hint].filter(Boolean).join(" ");
}

function logPostFailure(step: string, code: string, error: { message?: string; details?: string | null; hint?: string | null }) {
  console.error("[love-notes POST failed]", {
    step,
    code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
}

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    const authError = adminAuthResponse(password);
    if (authError) return authError;
    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCode();
    const space = await getSpaceByCode(code);
    if (!space) return NextResponse.json({ ok: false, error: "访问码不存在。", code: "SPACE_NOT_FOUND", step: "get_space" }, { status: 404 });
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ ok: true, notes: (data || []).map(loveNoteFromRow) });
  } catch {
    return NextResponse.json({ ok: false, error: "小纸条查询失败。", code: "LOVE_NOTES_LIST_FAILED", step: "list_love_notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");
    const code = String(formData.get("code") || getDefaultSpaceCode());
    const content = String(formData.get("content") || "").trim();
    const active = formData.get("active") === "true";
    const pinned = formData.get("pinned") === "true";
    const visibleFrom = String(formData.get("visible_from") || new Date().toISOString());
    const imageAlt = formData.get("image_alt");
    const image = formData.get("image");

    const authError = adminAuthResponse(password);
    if (authError) return authError;

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "小纸条内容不能为空。", code: "CONTENT_EMPTY", step: "validate_content" },
        { status: 400 }
      );
    }

    const space = await getSpaceByCode(code);
    if (!space) {
      return NextResponse.json(
        {
          ok: false,
          error: `没有找到 ${code}，请检查 couple_spaces 表。`,
          code: "SPACE_NOT_FOUND",
          step: "get_space"
        },
        { status: 404 }
      );
    }

    const supabase = createSupabaseServerClient();
    let imageUrl: string | null = null;
    let imagePath: string | null = null;

    if (image instanceof File && image.size > 0) {
      const validation = validateImageFile(image);
      if (!validation.ok) {
        return NextResponse.json(
          { ok: false, error: validation.error, code: "INVALID_IMAGE", step: "upload_image" },
          { status: 400 }
        );
      }

      imagePath = makeImagePath(code, image.type);
      const upload = await supabase.storage.from(BUCKET).upload(imagePath, image, {
        contentType: image.type,
        upsert: false
      });
      if (upload.error) {
        logPostFailure("upload_image", "IMAGE_UPLOAD_FAILED", upload.error);
        return NextResponse.json(
          {
            ok: false,
            error: "图片上传失败，请检查 love-notes Storage bucket。",
            code: "IMAGE_UPLOAD_FAILED",
            step: "upload_image",
            detail: developmentDetail(upload.error)
          },
          { status: 500 }
        );
      }
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("love_notes")
      .insert({
        space_id: space.id,
        content,
        active,
        pinned,
        author: "admin",
        note_type: imageUrl ? "mixed" : "text",
        display_style: "sticky",
        visible_from: visibleFrom,
        created_by: "admin",
        image_url: imageUrl ?? null,
        image_path: imagePath ?? null,
        image_alt: imageAlt ? String(imageAlt) : null
      })
      .select("*")
      .single();

    if (insertError) {
      const isRlsError = insertError.message?.includes("violates row-level security policy");
      const errorCode = isRlsError ? "RLS_INSERT_BLOCKED" : "LOVE_NOTES_INSERT_FAILED";
      logPostFailure("insert_love_note", errorCode, insertError);
      return NextResponse.json(
        {
          ok: false,
          error: isRlsError
            ? "服务端写入被 RLS 拦截，请检查 API route 是否使用 SUPABASE_SERVICE_ROLE_KEY。"
            : "小纸条保存失败，请检查 love_notes 表结构。",
          code: errorCode,
          step: "insert_love_note",
          detail: isRlsError
            ? process.env.NODE_ENV === "development" ? insertError.message : undefined
            : developmentDetail(insertError)
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, note: loveNoteFromRow(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logPostFailure("parse_form_data", "LOVE_NOTES_POST_FAILED", { message });
    return NextResponse.json(
      {
        ok: false,
        error: "小纸条发布请求处理失败。",
        code: "LOVE_NOTES_POST_FAILED",
        step: "parse_form_data",
        detail: process.env.NODE_ENV === "development" ? message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const authError = adminAuthResponse(body.password);
    if (authError) return authError;
    const code = String(body.code || getDefaultSpaceCode());
    const space = await getSpaceByCode(code);
    if (!space) return NextResponse.json({ ok: false, error: "访问码不存在。", code: "SPACE_NOT_FOUND", step: "get_space" }, { status: 404 });
    if (!body.id) {
      return NextResponse.json({ ok: false, error: "缺少小纸条 id。", code: "LOVE_NOTE_ID_MISSING", step: "validate_id" }, { status: 400 });
    }
    const supabase = createSupabaseServerClient();

    const { data: currentNote, error: findError } = await supabase
      .from("love_notes")
      .select("id, active, pinned, deleted_at")
      .eq("id", body.id)
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) throw findError;
    if (!currentNote) {
      return NextResponse.json({ ok: false, error: "没有找到这条小纸条。", code: "LOVE_NOTE_NOT_FOUND", step: "find_love_note" }, { status: 404 });
    }

    const action = body.action as LoveNotePatchAction | undefined;
    const updates: Record<string, unknown> = getLoveNotePatchUpdate({
      action,
      active: body.active,
      pinned: body.pinned,
      current: currentNote
    });
    if (action === "delete" || action === "soft_delete") updates.deleted_at = new Date().toISOString();
    if (typeof body.content === "string") updates.content = body.content;
    if (typeof body.image_alt === "string" || typeof body.imageAlt === "string") updates.image_alt = body.image_alt || body.imageAlt;

    if (shouldResetOtherPinnedNotes(action, body.pinned, currentNote.pinned)) {
      const reset = await supabase
        .from("love_notes")
        .update({ pinned: false })
        .eq("space_id", space.id)
        .is("deleted_at", null)
        .neq("id", body.id);
      if (reset.error) {
        return NextResponse.json(
          { ok: false, error: "取消其他置顶小纸条失败。", code: "LOVE_NOTE_PIN_RESET_FAILED", step: "reset_other_pinned", detail: developmentDetail(reset.error) },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabase
      .from("love_notes")
      .update(updates)
      .eq("id", body.id)
      .eq("space_id", space.id)
      .select("*")
      .single();
    if (error) {
      const deleteAction = action === "delete" || action === "soft_delete";
      return NextResponse.json(
        {
          ok: false,
          error: deleteAction ? "小纸条删除失败。" : "小纸条更新失败。",
          code: deleteAction ? "LOVE_NOTE_DELETE_FAILED" : "LOVE_NOTE_UPDATE_FAILED",
          step: deleteAction ? "delete_love_note" : "update_love_note",
          detail: developmentDetail(error)
        },
        { status: 500 }
      );
    }
    if (action === "delete" || action === "soft_delete") return NextResponse.json({ ok: true, deleted: true, id: body.id });
    return NextResponse.json({ ok: true, note: loveNoteFromRow(data) });
  } catch {
    return NextResponse.json({ ok: false, error: "小纸条更新请求失败。", code: "LOVE_NOTE_PATCH_FAILED", step: "patch_love_note" }, { status: 500 });
  }
}
