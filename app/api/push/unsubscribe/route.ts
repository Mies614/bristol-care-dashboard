import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.endpoint) {
      return NextResponse.json(
        { ok: false, error: "缺少 endpoint。", code: "PUSH_ENDPOINT_MISSING" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq("endpoint", body.endpoint);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "取消订阅失败。", code: "PUSH_UNSUBSCRIBE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "PUSH_UNSUBSCRIBE_FAILED" },
      { status: 500 }
    );
  }
}