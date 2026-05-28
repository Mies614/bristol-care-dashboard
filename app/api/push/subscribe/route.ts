import { NextRequest, NextResponse } from "next/server";
import { getSpaceByCode, getDefaultSpaceCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultSpaceCode();
    const role = body.role || "admin";

    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { ok: false, error: "缺少订阅信息。", code: "PUSH_SUBSCRIPTION_MISSING" },
        { status: 400 }
      );
    }

    const space = await getSpaceByCode(code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        space_id: space.id,
        role,
        endpoint: body.subscription.endpoint,
        subscription: body.subscription,
        user_agent: body.userAgent || null,
        enabled: true,
        updated_at: new Date().toISOString()
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "订阅失败。", code: "PUSH_SUBSCRIBE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "PUSH_SUBSCRIBE_FAILED" },
      { status: 500 }
    );
  }
}