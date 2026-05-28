import { NextRequest, NextResponse } from "next/server";
import { getSpaceByCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendMissYouPushToRole,
  getOppositeAuthors,
  getRecipientForAuthor,
  type MissYouEvent
} from "@/lib/push";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDefaultCode(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "xiaoguai520";
}

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// GET  /api/miss-you
// Query params:
//   code, localDate, limit, viewer
// If viewer is provided, also returns unreadFromOtherCount and lastSeenAt
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || getDefaultCode();
    const localDate = searchParams.get("localDate") || getLocalDateKey();
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const viewer = searchParams.get("viewer");

    const space = await getSpaceByCode(code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const supabase = createSupabaseServerClient();

    // ── todayCount ──────────────────────────────────────────────────
    const { count: todayCount, error: countError } = await supabase
      .from("miss_you_events")
      .select("*", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);

    if (countError) {
      return NextResponse.json(
        { ok: false, error: "查询失败。", code: "MISS_YOU_FETCH_FAILED" },
        { status: 500 }
      );
    }

    // ── todayByAuthor ───────────────────────────────────────────────
    const { data: todayEvents } = await supabase
      .from("miss_you_events")
      .select("author")
      .eq("space_id", space.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);

    const todayByAuthor: Record<string, number> = {};
    if (todayEvents) {
      for (const ev of todayEvents) {
        const a = ev.author || "xiaoguai";
        todayByAuthor[a] = (todayByAuthor[a] || 0) + 1;
      }
    }

    // ── latestEvents ────────────────────────────────────────────────
    const { data: latestEvents, error: eventsError } = await supabase
      .from("miss_you_events")
      .select("*")
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventsError) {
      return NextResponse.json(
        { ok: false, error: "查询失败。", code: "MISS_YOU_FETCH_FAILED" },
        { status: 500 }
      );
    }

    const lastEvent = latestEvents && latestEvents.length > 0 ? latestEvents[0] : null;

    // ── viewer-specific unread ──────────────────────────────────────
    let lastSeenAt: string | null = null;
    let unreadFromOtherCount = 0;
    let unreadFromOtherEvents: unknown[] = [];

    if (viewer && (viewer === "admin" || viewer === "xiaoguai")) {
      // fetch last_seen_at
      const { data: seenState } = await supabase
        .from("miss_you_seen_state")
        .select("last_seen_at")
        .eq("space_id", space.id)
        .eq("viewer", viewer)
        .maybeSingle();

      lastSeenAt = seenState?.last_seen_at || null;
      const oppositeAuthors = getOppositeAuthors(viewer);

      if (lastSeenAt) {
        // Count unread from opposite authors after last_seen_at
        let query = supabase
          .from("miss_you_events")
          .select("*", { count: "exact", head: true })
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .gt("created_at", lastSeenAt);

        for (const author of oppositeAuthors) {
          query = query.or(`author.eq.${author}`);
        }

        const { count: unreadCount } = await query;
        unreadFromOtherCount = unreadCount || 0;

        // Fetch actual unread events (limit 5)
        let eventsQuery = supabase
          .from("miss_you_events")
          .select("*")
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .gt("created_at", lastSeenAt)
          .order("created_at", { ascending: false })
          .limit(5);

        for (const author of oppositeAuthors) {
          eventsQuery = eventsQuery.or(`author.eq.${author}`);
        }

        const { data: unreadEvents } = await eventsQuery;
        unreadFromOtherEvents = unreadEvents || [];
      } else {
        // No last_seen_at → count all opposite author events
        let query = supabase
          .from("miss_you_events")
          .select("*", { count: "exact", head: true })
          .eq("space_id", space.id)
          .is("deleted_at", null);

        for (const author of oppositeAuthors) {
          query = query.or(`author.eq.${author}`);
        }

        const { count: allCount } = await query;
        unreadFromOtherCount = allCount || 0;

        let eventsQuery = supabase
          .from("miss_you_events")
          .select("*")
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        for (const author of oppositeAuthors) {
          eventsQuery = eventsQuery.or(`author.eq.${author}`);
        }

        const { data: allEvents } = await eventsQuery;
        unreadFromOtherEvents = allEvents || [];
      }
    }

    return NextResponse.json({
      ok: true,
      todayCount: todayCount || 0,
      todayByAuthor,
      latestEvents: latestEvents || [],
      lastEvent,
      viewer: viewer || null,
      lastSeenAt,
      unreadFromOtherCount,
      unreadFromOtherEvents
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MISS_YOU_FETCH_FAILED" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/miss-you
// Body:
//   code, author, recipient, message, localDate, source
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultCode();
    const author = (body.author || "xiaoguai") as string;
    const recipient = body.recipient || getRecipientForAuthor(author);
    const message = body.message || (author === "xiaoguai" ? "想你一下" : "我也想你一下");
    const localDate = body.localDate || getLocalDateKey();
    const source = body.source || "button";

    // Validate localDate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return NextResponse.json(
        { ok: false, error: "日期格式不正确。", code: "INVALID_LOCAL_DATE" },
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

    const { data: event, error: insertError } = await supabase
      .from("miss_you_events")
      .insert({
        space_id: space.id,
        author,
        recipient,
        message,
        local_date: localDate,
        source
      })
      .select()
      .single();

    if (insertError || !event) {
      return NextResponse.json(
        { ok: false, error: "记录失败。", code: "MISS_YOU_CREATE_FAILED" },
        { status: 500 }
      );
    }

    // Recalculate today counts
    const { count: todayCount } = await supabase
      .from("miss_you_events")
      .select("*", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);

    const { data: todayEvents } = await supabase
      .from("miss_you_events")
      .select("author")
      .eq("space_id", space.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);

    const todayByAuthor: Record<string, number> = {};
    if (todayEvents) {
      for (const ev of todayEvents) {
        const a = ev.author || "xiaoguai";
        todayByAuthor[a] = (todayByAuthor[a] || 0) + 1;
      }
    }

    // Send push notifications (async, don't block response)
    let pushResult = { attempted: false, sent: 0, failed: 0 };
    try {
      const missYouEvent: MissYouEvent = {
        id: event.id,
        space_id: space.id,
        author,
        recipient,
        message,
        local_date: localDate,
        created_at: event.created_at
      };

      // Push to the recipient's role
      const pushRole = recipient === "xiaoguai" ? "xiaoguai" : "admin";
      pushResult = await sendMissYouPushToRole(
        supabase,
        space.id,
        pushRole,
        missYouEvent,
        todayCount || 1
      );
    } catch {
      // Push failure should not affect the event recording
    }

    return NextResponse.json({
      ok: true,
      event,
      todayCount: todayCount || 0,
      todayByAuthor,
      push: pushResult
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MISS_YOU_CREATE_FAILED" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/miss-you
// Body:
//   code, viewer, action: "mark_seen"
//   Upserts miss_you_seen_state with last_seen_at = now()
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultCode();
    const viewer = body.viewer as string;
    const action = body.action as string;

    if (!viewer || (viewer !== "admin" && viewer !== "xiaoguai")) {
      return NextResponse.json(
        { ok: false, error: "viewer 必须是 admin 或 xiaoguai。", code: "INVALID_VIEWER" },
        { status: 400 }
      );
    }

    if (action !== "mark_seen") {
      return NextResponse.json(
        { ok: false, error: "不支持的操作。", code: "UNSUPPORTED_ACTION" },
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
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("miss_you_seen_state")
      .upsert(
        {
          space_id: space.id,
          viewer,
          last_seen_at: now,
          updated_at: now
        },
        { onConflict: "space_id,viewer" }
      );

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: "更新失败。", code: "MARK_SEEN_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      viewer,
      lastSeenAt: now
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MARK_SEEN_FAILED" },
      { status: 500 }
    );
  }
}