import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { resolveRequestContext } from "@/lib/security/requestContext";
import {
  sendMissYouPushToRole,
  getOppositeAuthors,
  getRecipientForAuthor,
  type MissYouEvent
} from "@/lib/push";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
//   code, localDate, limit, viewer, includeUnread
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextResult = resolveRequestContext(request, {
      spaceCode: searchParams.get("spaceCode"),
      code: searchParams.get("code"),
      viewer: searchParams.get("viewer"),
    });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode: code } = contextResult.context;
    const localDate = searchParams.get("localDate") || getLocalDateKey();
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const viewer = searchParams.get("viewer");
    const includeUnread = searchParams.get("includeUnread") === "true";

    const supabase = createSupabaseServerClient();

    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

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
    const { data: latestEvents } = await supabase
      .from("miss_you_events")
      .select("*")
      .eq("space_id", space.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const lastEvent = latestEvents && latestEvents.length > 0 ? latestEvents[0] : null;

    // ── viewer-specific unread ──────────────────────────────────────
    let lastSeenAt: string | null = null;
    let unreadFromOtherCount = 0;
    let unreadFromOtherEvents: unknown[] = [];
    let oppositeAuthors: string[] = [];
    let unreadQueryUsedCreatedAtFilter = false;

    if (viewer && includeUnread) {
      oppositeAuthors = getOppositeAuthors(viewer);

      // fetch seen state
      const { data: seenState } = await supabase
        .from("miss_you_seen_state")
        .select("last_seen_at")
        .eq("space_id", space.id)
        .eq("viewer", viewer)
        .maybeSingle();

      lastSeenAt = seenState?.last_seen_at ?? null;
      unreadQueryUsedCreatedAtFilter = lastSeenAt !== null;

      if (oppositeAuthors.length > 0) {
        // Build base unread count query (with head:true for count-only)
        let countQuery = supabase
          .from("miss_you_events")
          .select("*", { count: "exact", head: true })
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .in("author", oppositeAuthors);

        // Build base unread data query (for fetching the actual events)
        let dataQuery = supabase
          .from("miss_you_events")
          .select("*")
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .in("author", oppositeAuthors)
          .order("created_at", { ascending: false })
          .limit(10);

        // Only add time filter when lastSeenAt exists (not null)
        if (lastSeenAt) {
          countQuery = countQuery.gt("created_at", lastSeenAt);
          dataQuery = dataQuery.gt("created_at", lastSeenAt);
        }

        // Run count and data queries separately
        const { count: unreadCount, error: unreadCountError } = await countQuery;
        const { data: unreadEvents, error: unreadDataError } = await dataQuery;

        if (unreadCountError) {
          console.error("[miss-you GET] unread count error:", unreadCountError);
        }
        if (unreadDataError) {
          console.error("[miss-you GET] unread data error:", unreadDataError);
        }

        // Explicitly compute count: prefer the count from the count query,
        // fall back to events array length if count is null
        unreadFromOtherCount = unreadCount ?? unreadEvents?.length ?? 0;
        unreadFromOtherEvents = unreadEvents ?? [];
      }
    }

    const response: Record<string, unknown> = {
      ok: true,
      todayCount: todayCount || 0,
      todayByAuthor,
      latestEvents: latestEvents || [],
      lastEvent,
      viewer: viewer || null,
      lastSeenAt,
      oppositeAuthors,
      unreadFromOtherCount,
      unreadFromOtherEvents
    };

    // ── Debug info (no secrets) ─────────────────────────────────────
    response.debug = {
      viewer,
      includeUnread,
      spaceCode: code,
      spaceId: space.id,
      lastSeenAt,
      oppositeAuthors,
      unreadFromOtherCount,
      unreadEventsLength: unreadFromOtherEvents.length,
      unreadQueryUsedCreatedAtFilter
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MISS_YOU_FETCH_FAILED", debug: String(err) },
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
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode: code, identity: author } = contextResult.context;
    const recipient = getRecipientForAuthor(author);
    const message = body.message || "想你一下";
    const localDate = body.localDate || getLocalDateKey();
    const source = body.source || "button";

    // Validate localDate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return NextResponse.json(
        { ok: false, error: "日期格式不正确。", code: "INVALID_LOCAL_DATE" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

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
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode: code, identity: viewer } = contextResult.context;
    const action = body.action as string;

    if (!viewer || (viewer !== "xiaoguai" && viewer !== "me")) {
      return NextResponse.json(
        { ok: false, error: "viewer 必须是 xiaoguai 或 me。", code: "INVALID_VIEWER" },
        { status: 400 }
      );
    }

    if (action !== "mark_seen") {
      return NextResponse.json(
        { ok: false, error: "不支持的操作。", code: "UNSUPPORTED_ACTION" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const space = await getSpaceByCode(supabase, code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

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
