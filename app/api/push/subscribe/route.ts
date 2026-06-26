import { NextRequest, NextResponse } from "next/server";
import { getSpaceByCode } from "@/lib/api/cloud";
import { resolveApiAuth } from "@/lib/security/apiAuth";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: "云端服务暂不可用。", code: "SUPABASE_UNAVAILABLE" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "请求格式无效。", code: "PUSH_BAD_REQUEST" }, { status: 400 });
  }

  const auth = await resolveApiAuth(request, body, true);
  if (!auth.ok) return auth.response;
  const { spaceCode: code, identity } = auth.context;

  if (!body.subscription || typeof body.subscription !== "object") {
    return NextResponse.json({ ok: false, error: "缺少订阅信息。", code: "PUSH_SUBSCRIPTION_MISSING" }, { status: 400 });
  }

  const subscription = body.subscription as Record<string, unknown>;
  if (!subscription.endpoint || typeof subscription.endpoint !== "string") {
    return NextResponse.json({ ok: false, error: "订阅信息缺少 endpoint。", code: "PUSH_SUBSCRIPTION_MISSING" }, { status: 400 });
  }

  const space = await getSpaceByCode(code);
  if (!space) return NextResponse.json({ ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" }, { status: 404 });

  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("push_subscriptions").upsert({
    space_id: space.id,
    role: identity,
    endpoint: subscription.endpoint,
    subscription,
    user_agent: typeof body.userAgent === "string" ? body.userAgent : null,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) {
    console.error("[push/subscribe] upsert error:", error.message);
    return NextResponse.json({ ok: false, error: "订阅保存失败。", code: "PUSH_SUBSCRIBE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
