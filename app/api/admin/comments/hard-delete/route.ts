export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({ error: "Supabase 未配置。" }, { status: 503 });
    }

    const { commentId } = await request.json();
    if (!commentId) {
      return NextResponse.json({ error: "commentId 不能为空。" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("content_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      return NextResponse.json({ error: "永久删除评论失败。" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, commentId });
  } catch (err) {
    return NextResponse.json({ error: "服务器错误。", detail: String(err) }, { status: 500 });
  }
}