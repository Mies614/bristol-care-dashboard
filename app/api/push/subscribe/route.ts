import { NextRequest, NextResponse } from "next/server";
import { getSpaceByCode } from "@/lib/api/cloud";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Check Supabase availability first
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, error: "云端服务暂不可用。", code: "SUPABASE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求格式无效。", code: "PUSH_BAD_REQUEST" },
      { status: 400 }
    );
  }

  const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
  if (!contextResult.ok) return contextResult.response;
  const code = contextResult.context.spaceCode;
  const role = contextResult.context.side === "owner" ? "admin" : "xiaoguai";

  if (!body.subscription || typeof body.subscription !== "object") {
    return NextResponse.json(
      { ok: false, error: "缺少订阅信息。", code: "PUSH_SUBSCRIPTION_MISSING" },
      { status: 400 }
    );
  }

  const subscription = body.subscription as Record<string, unknown>;
  if (!subscription.endpoint || typeof subscription.endpoint !== "string") {
    return NextResponse.json(
      { ok: false, error: "订阅信息缺少 endpoint。", code: "PUSH_SUBSCRIPTION_MISSING" },
      { status: 400 }
    );
  }

  let space;
  try {
    space = await getSpaceByCode(code);
  } catch {
    return NextResponse.json(
      { ok: false, error: "空间查询失败。", code: "SPACE_QUERY_FAILED" },
      { status: 502 }
    );
  }

  if (!space) {
    return NextResponse.json(
      { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
      { status: 404 }
    );
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "云端服务暂不可用。", code: "SUPABASE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      space_id: space.id,
      role,
      endpoint: subscription.endpoint,
      subscription: subscription,
      user_agent: typeof body.userAgent === "string" ? body.userAgent : null,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] upsert error:", error.message);
    return NextResponse.json(
      { ok: false, error: "订阅保存失败。", code: "PUSH_SUBSCRIBE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
