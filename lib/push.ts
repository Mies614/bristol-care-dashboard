import webpush from "web-push";
import { DEFAULT_NORMAL_IDENTITY_ID, ADMIN_IDENTITY_ID } from "@/lib/identity";

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
  recipient?: string;
  message: string;
  local_date: string;
  created_at: string;
}

export interface PushResult {
  attempted: boolean;
  sent: number;
  failed: number;
}

/**
 * Get the opposite author(s) for a given viewer.
 */
export function getOppositeAuthors(viewer: string): string[] {
  if (viewer === ADMIN_IDENTITY_ID) return [DEFAULT_NORMAL_IDENTITY_ID];
  if (viewer === DEFAULT_NORMAL_IDENTITY_ID) return [ADMIN_IDENTITY_ID, "me"];
  return [];
}

/**
 * Get the recipient for a given author.
 */
export function getRecipientForAuthor(author: string): string {
  if (author === DEFAULT_NORMAL_IDENTITY_ID) return ADMIN_IDENTITY_ID;
  return DEFAULT_NORMAL_IDENTITY_ID;
}

/**
 * Get the display title/body for a push notification based on author.
 */
export function getPushNotificationContent(
  author: string,
  todayCount: number
): { title: string; body: string } {
  if (author === DEFAULT_NORMAL_IDENTITY_ID || author === "小乖") {
    const body =
      todayCount === 1
        ? `她刚刚点了一下"想你一下"。`
        : todayCount <= 4
        ? `今天第 ${todayCount} 次想你。`
        : `今天的想念有点满。`;
    return { title: "小乖想你啦", body };
  }
  // admin/me
  const body =
    todayCount === 1
      ? `他也点了一下"想你一下"。`
      : `也想你 ${todayCount} 次了。`;
  return { title: "他也想你啦", body };
}

/**
 * Get the push notification URL based on recipient role.
 */
export function getPushUrlForRecipient(recipient: string): string {
  if (recipient === DEFAULT_NORMAL_IDENTITY_ID) return "/";
  return "/admin";
}

/**
 * Send push notifications to all subscriptions for a given role in a space.
 * Generic version that supports any role (admin, xiaoguai).
 */
export async function sendMissYouPushToRole(
  supabase: ReturnType<typeof import("./supabase/server").createSupabaseServerClient>,
  spaceId: string,
  role: string,
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
      .eq("role", role)
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

    const { title, body } = getPushNotificationContent(event.author, todayCount);
    const url = getPushUrlForRecipient(event.recipient || getRecipientForAuthor(event.author));

    const payload: PushPayload = {
      title,
      body,
      url,
      eventId: event.id,
      createdAt: event.created_at
    };

    const payloadStr = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription as unknown as webpush.PushSubscription;
        await webpush.sendNotification(subscription, payloadStr);
        sent++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        if (err.statusCode === 410 || err.statusCode === 404) {
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

/**
 * Send push notifications to admin subscribers (backwards compatible).
 */
export async function sendMissYouPushToAdmins(
  supabase: ReturnType<typeof import("./supabase/server").createSupabaseServerClient>,
  spaceId: string,
  event: MissYouEvent,
  todayCount: number
): Promise<PushResult> {
  return sendMissYouPushToRole(supabase, spaceId, "admin", event, todayCount);
}