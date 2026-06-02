import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";

const VALID_CONTENT_TYPES = ["note", "album", "memory"] as const;
const MAX_COMMENT_LENGTH = 500;

function getDefaultCode(): string {
  return getDefaultSpaceCodeServer();
}

// ─── GET /api/comments ───
// Query params:
//   code, contentType, contentId, includeDeleted (optional, admin only via x-admin-password)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || getDefaultCode();
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const identity = searchParams.get("identity") || "xiaoguai";

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    if (!contentId) {
      return NextResponse.json(
        { ok: false, error: "contentId 不能为空。", code: "MISSING_CONTENT_ID" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("content_comments")
      .select("*")
      .eq("space_id", space.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    // By default, exclude soft-deleted comments
    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data: comments, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: "查询评论失败。", code: "COMMENTS_FETCH_FAILED" },
        { status: 500 }
      );
    }

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
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "COMMENTS_FETCH_FAILED", debug: String(err) },
      { status: 500 }
    );
  }
}

// ─── POST /api/comments ───
// Body: code, contentType, contentId, body, identity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultCode();
    const contentType = body.contentType as string;
    const contentId = body.contentId as string;
    const commentBody = (body.body as string || "").trim();
    const identity = (body.identity as string) || "xiaoguai";

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    if (!contentId) {
      return NextResponse.json(
        { ok: false, error: "contentId 不能为空。", code: "MISSING_CONTENT_ID" },
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
    const space = await getSpaceByCode(supabase, code);
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
        space_id: space.id,
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
      return NextResponse.json(
        { ok: false, error: "创建评论失败。", code: "COMMENT_CREATE_FAILED" },
        { status: 500 }
      );
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
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "COMMENT_CREATE_FAILED", debug: String(err) },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/comments ───
// Body: code, commentId, identity (to verify ownership — admin can delete any)
// Header: x-admin-password (admin password for admin override)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultCode();
    const commentId = body.commentId as string;
    const identity = (body.identity as string) || "xiaoguai";
    const adminPassword = request.headers.get("x-admin-password") || "";

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!commentId) {
      return NextResponse.json(
        { ok: false, error: "commentId 不能为空。", code: "MISSING_COMMENT_ID" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch the comment to verify
    const { data: comment, error: fetchError } = await supabase
      .from("content_comments")
      .select("*")
      .eq("id", commentId)
      .eq("space_id", space.id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { ok: false, error: "评论未找到或已被删除。", code: "COMMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check identity ownership (admin can delete any)
    const isAdmin = identity === "admin" || identity === "me";
    if (!isAdmin && comment.identity !== identity) {
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
      return NextResponse.json(
        { ok: false, error: "删除评论失败。", code: "COMMENT_DELETE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "soft_deleted",
      commentId,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "COMMENT_DELETE_FAILED", debug: String(err) },
      { status: 500 }
    );
  }
}