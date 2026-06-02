export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getVapidConfig } from "@/lib/push";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/push/test
 * Send a test push notification to all subscribed devices for a role.
 */
export async function POST(request: NextRequest) {
  try {
    const config = getVapidConfig();
    if (!config.configured) {
      return NextResponse.json(
        { ok: false, error: "推送通知未配置，缺少 VAPID 密钥。" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const code = body.code || getDefaultSpaceCode();
    const role = body.role || "xiaoguai";

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(code);

    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。" },
        { status: 404 }
      );
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription, endpoint, id")
      .eq("space_id", space.id)
      .eq("role", role)
      .eq("enabled", true)
      .is("deleted_at", null);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "没有找到已订阅的设备。请先在设置中开启通知。",
        sent: 0,
      });
    }

    webpush.setVapidDetails(
      config.subject!,
      config.publicKey!,
      config.privateKey!
    );

    const payload = JSON.stringify({
      title: "Bristol Care 测试通知 ✨",
      body: "如果你收到这条消息，说明推送通知已经配置成功了。今天的 Bristol 天气不错，照顾好自己。",
      url: "/",
      tag: "test-notification",
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription as unknown as webpush.PushSubscription;
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      message: failed === 0
        ? `已向 ${sent} 个设备发送测试通知 ✨`
        : `已向 ${sent} 个设备发送成功，${failed} 个失败。`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "测试通知发送失败。",
      },
      { status: 500 }
    );
  }
}
