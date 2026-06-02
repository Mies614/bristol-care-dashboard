export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: "Supabase 未配置。" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || getDefaultSpaceCodeServer();
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json({ error: "空间未找到。" }, { status: 404 });
    }

    let query = supabase
      .from("content_comments")
      .select("*")
      .eq("space_code", space.code)
      .order("created_at", { ascending: false });

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "查询评论失败。" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      comments: (data || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        contentType: c.content_type,
        contentId: c.content_id,
        identity: c.identity,
        body: c.body,
        deletedAt: c.deleted_at || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "服务器错误。", detail: String(err) },
      { status: 500 }
    );
  }
}