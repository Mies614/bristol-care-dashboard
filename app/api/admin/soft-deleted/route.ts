export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { loveNoteFromRow } from "@/lib/mappers";

/**
 * GET /api/admin/soft-deleted
 * List soft-deleted love notes (deleted_at IS NOT NULL).
 */
export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: "Supabase 未配置。", code: "SUPABASE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCodeServer();
    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);

    if (!space) {
      return NextResponse.json({ error: "空间不存在。" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "查询已删除小纸条失败。", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      notes: (data || []).map((row: Record<string, unknown>) =>
        loveNoteFromRow(row as Parameters<typeof loveNoteFromRow>[0])
      ),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "请求失败。",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/soft-deleted
 * Restore or permanently delete soft-deleted love notes.
 *
 * Body:
 *   { id: string, action: "restore" | "permanent_delete", code?: string, password?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password || request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "缺少小纸条 id。" },
        { status: 400 }
      );
    }

    const action = body.action as string;
    if (action !== "restore" && action !== "permanent_delete") {
      return NextResponse.json(
        { error: "不支持的操作，请使用 restore 或 permanent_delete。" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: "Supabase 未配置。" },
        { status: 503 }
      );
    }

    const code = body.code || getDefaultSpaceCodeServer();
    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);

    if (!space) {
      return NextResponse.json({ error: "空间不存在。" }, { status: 404 });
    }

    if (action === "restore") {
      // Restore: set deleted_at to null and reactivate
      const { error } = await supabase
        .from("love_notes")
        .update({
          deleted_at: null,
          active: true,
          pinned: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("space_id", space.id);

      if (error) {
        return NextResponse.json(
          { error: "恢复小纸条失败。", detail: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, action: "restored", id: body.id });
    }

    // Permanent delete
    // Note: does NOT delete Storage files — those remain as potential orphans
    const { error } = await supabase
      .from("love_notes")
      .delete()
      .eq("id", body.id)
      .eq("space_id", space.id);

    if (error) {
      return NextResponse.json(
        { error: "永久删除小纸条失败。", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "permanently_deleted",
      id: body.id,
      note: "数据库记录已永久删除。关联的 Storage 文件未被删除，可在孤儿文件检查中查看。",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "操作失败。",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
