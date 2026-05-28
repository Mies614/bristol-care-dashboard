import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  eventId: string;
  createdAt: string;
}

export interface VapidConfig {
  publicKey: string | undefined;
  privateKey: string | undefined;
  subject: string | undefined;
  configured: boolean;
}

export function getVapidConfig(): VapidConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return {
    publicKey,
    privateKey,
    subject,
    configured: !!(publicKey && privateKey && subject)
  };
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ attempted: boolean; sent: boolean; reason?: string }> {
  const config = getVapidConfig();
  if (!config.configured) {
    return { attempted: false, sent: false, reason: "VAPID_NOT_CONFIGURED" };
  }

  try {
    webpush.setVapidDetails(
      config.subject!,
      config.publicKey!,
      config.privateKey!
    );
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { attempted: true, sent: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { attempted: true, sent: false, reason: "SUBSCRIPTION_EXPIRED" };
    }
    return { attempted: true, sent: false, reason: "SEND_FAILED" };
  }
}

export interface MissYouEvent {
  id: string;
  space_id: string;
  author: string;
  message: string;
  local_date: string;
  created_at: string;
}

export interface PushResult {
  attempted: boolean;
  sent: number;
  failed: number;
}

export async function sendMissYouPushToAdmins(
  supabase: ReturnType<typeof import("./supabase/server").createSupabaseServerClient>,
  spaceId: string,
  event: MissYouEvent,
  todayCount: number
): Promise<PushResult> {
  const config = getVapidConfig();
  if (!config.configured) {
    return { attempted: false, sent: 0, failed: 0 };
  }

  try {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription, endpoint, id")
      .eq("space_id", spaceId)
      .eq("role", "admin")
      .eq("enabled", true)
      .is("deleted_at", null);

    if (!subscriptions || subscriptions.length === 0) {
      return { attempted: false, sent: 0, failed: 0 };
    }

    webpush.setVapidDetails(
      config.subject!,
      config.publicKey!,
      config.privateKey!
    );

    let sent = 0;
    let failed = 0;

    const body =
      todayCount === 1
        ? `她刚刚点了一下\u201C想你一下\u201D。`
        : todayCount <= 4
        ? `今天第 ${todayCount} 次想你。`
        : `今天的想念有点满。`;

    const payload: PushPayload = {
      title: "小乖想你啦",
      body,
      url: "/admin",
      eventId: event.id,
      createdAt: event.created_at
    };

    const payloadStr = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription as unknown as webpush.PushSubscription;
        await webpush.sendNotification(subscription, payloadStr);
        sent++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Mark subscription as disabled
          await supabase
            .from("push_subscriptions")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
        failed++;
      }
    }

    return { attempted: true, sent, failed };
  } catch {
    return { attempted: true, sent: 0, failed: 1 };
  }
}