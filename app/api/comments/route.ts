import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";

const VALID_CONTENT_TYPES = ["note", "album", "memory"] as const;
const MAX_COMMENT_LENGTH = 500;

// ─── GET /api/comments ───
// Query params:
//   spaceCode (or legacy: code), contentType, contentId, includeDeleted (optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextResult = resolveRequestContext(request, {
      spaceCode: searchParams.get("spaceCode"),
      code: searchParams.get("code"),
      identity: searchParams.get("identity"),
    });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");
    const includeDeleted = searchParams.get("includeDeleted") === "true" && identity === "me";

    // ── Required param validation ──
    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!contentType) missing.push("contentType");
    if (!contentId) missing.push("contentId");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("content_comments")
      .select("*")
      .eq("space_code", spaceCode)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    // By default, exclude soft-deleted comments
    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data: comments, error: fetchError } = await query;

    if (fetchError) {
      const safeError = toSafeApiError(fetchError, "COMMENTS_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    // Return empty array when no comments — not an error
    return NextResponse.json({
      ok: true,
      comments: (comments || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        contentType: c.content_type,
        contentId: c.content_id,
        identity: c.identity,
        body: c.body,
        deletedAt: c.deleted_at || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      identity,
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "COMMENTS_FETCH_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── POST /api/comments ───
// Body: spaceCode (or legacy: code), contentType, contentId, body, identity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;
    const contentType = body.contentType as string;
    const contentId = body.contentId as string;
    const commentBody = (body.body as string || "").trim();

    // ── Required param validation ──
    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!contentType) missing.push("contentType");
    if (!contentId) missing.push("contentId");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    if (!commentBody) {
      return NextResponse.json(
        { ok: false, error: "评论内容不能为空。", code: "EMPTY_COMMENT" },
        { status: 400 }
      );
    }

    if (commentBody.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { ok: false, error: `评论内容不能超过 ${MAX_COMMENT_LENGTH} 字。`, code: "COMMENT_TOO_LONG" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { data: comment, error: insertError } = await supabase
      .from("content_comments")
      .insert({
        space_code: spaceCode,
        content_type: contentType,
        content_id: contentId,
        identity,
        body: commentBody,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError || !comment) {
      const safeError = toSafeApiError(insertError, "COMMENT_CREATE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        contentType: comment.content_type,
        contentId: comment.content_id,
        identity: comment.identity,
        body: comment.body,
        deletedAt: null,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      },
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "COMMENT_CREATE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── DELETE /api/comments ───
// Body: spaceCode (or legacy: code), commentId, identity (to verify ownership — admin can delete any)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;
    const commentId = body.commentId as string;

    // ── Required param validation ──
    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!commentId) missing.push("commentId");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await supabase
      .from("content_comments")
      .select("*")
      .eq("id", commentId)
      .eq("space_code", spaceCode)
      .maybeSingle();

    if (fetchError) {
      const safeError = toSafeApiError(fetchError, "COMMENT_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    if (!comment) {
      return NextResponse.json(
        { ok: false, error: "评论未找到或已被删除。", code: "COMMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Owner-side context can moderate comments; partner can delete only their own.
    const isOwnerSide = identity === "me";
    if (!isOwnerSide && comment.identity !== identity) {
      return NextResponse.json(
        { ok: false, error: "无权删除此评论。", code: "UNAUTHORIZED_COMMENT_DELETE" },
        { status: 403 }
      );
    }

    // Soft delete
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("content_comments")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", commentId);

    if (updateError) {
      const safeError = toSafeApiError(updateError, "COMMENT_DELETE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "soft_deleted",
      commentId,
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "COMMENT_DELETE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}
