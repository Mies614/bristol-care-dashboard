import { NextRequest, NextResponse } from "next/server";
import { getSpaceByCode, getDefaultSpaceCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMissYouPushToAdmins } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || getDefaultSpaceCode();
    const localDate = searchParams.get("localDate") || new Date().toISOString().split("T")[0];
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

    const space = await getSpaceByCode(code);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const supabase = createSupabaseServerClient();

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

    return NextResponse.json({
      ok: true,
      todayCount: todayCount || 0,
      latestEvents: latestEvents || [],
      lastEvent
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MISS_YOU_FETCH_FAILED" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code || getDefaultSpaceCode();
    const author = body.author || "xiaoguai";
    const message = body.message || "想你一下";
    const localDate = body.localDate || new Date().toISOString().split("T")[0];

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
        message,
        local_date: localDate
      })
      .select()
      .single();

    if (insertError || !event) {
      return NextResponse.json(
        { ok: false, error: "记录失败。", code: "MISS_YOU_CREATE_FAILED" },
        { status: 500 }
      );
    }

    // Recalculate today count
    const { count: todayCount } = await supabase
      .from("miss_you_events")
      .select("*", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("local_date", localDate)
      .is("deleted_at", null);

    // Send push notifications (async, don't block response)
    let pushResult = { attempted: false, sent: 0, failed: 0 };
    try {
      pushResult = await sendMissYouPushToAdmins(
        supabase,
        space.id,
        {
          id: event.id,
          space_id: space.id,
          author,
          message,
          local_date: localDate,
          created_at: event.created_at
        },
        todayCount || 1
      );
    } catch {
      // Push failure should not affect the event recording
    }

    return NextResponse.json({
      ok: true,
      event,
      todayCount: todayCount || 0,
      push: pushResult
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误。", code: "MISS_YOU_CREATE_FAILED" },
      { status: 500 }
    );
  }
}