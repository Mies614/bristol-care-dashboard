import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";

const VALID_CONTENT_TYPES = ["note", "album", "memory", "timeline"] as const;
type ReadContentType = (typeof VALID_CONTENT_TYPES)[number];

// ─── GET /api/read-state ───
// Query: spaceCode, identity, contentType? (optional), contentIds? (comma-separated, optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextResult = resolveRequestContext(request, {
      spaceCode: searchParams.get("spaceCode"),
      code: searchParams.get("code"),
      identity: searchParams.get("identity"),
    });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;
    const contentType = searchParams.get("contentType") as ReadContentType | null;
    const contentIdsRaw = searchParams.get("contentIds");

    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!identity) missing.push("identity");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (contentType && !VALID_CONTENT_TYPES.includes(contentType as ReadContentType)) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("content_reads")
      .select("content_type, content_id, identity, read_at")
      .eq("space_code", spaceCode)
      .eq("identity", identity);

    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    if (contentIdsRaw) {
      const contentIds = contentIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (contentIds.length > 0 && contentIds.length <= 200) {
        query = query.in("content_id", contentIds);
      }
    }

    const { data: reads, error: fetchError } = await query;

    if (fetchError) {
      const safeError = toSafeApiError(fetchError, "READ_STATE_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      reads: (reads || []).map((r: Record<string, unknown>) => ({
        contentType: r.content_type,
        contentId: r.content_id,
        identity: r.identity,
        readAt: r.read_at,
      })),
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "READ_STATE_FETCH_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── POST /api/read-state ───
// Body: spaceCode, identity, items[] (array of {contentType, contentId})
// Also supports single: spaceCode, identity, contentType, contentId
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;

    // Normalize items: accept either single or batch
    const rawItems: Array<{ contentType: string; contentId: string }> =
      Array.isArray(body.items)
        ? body.items
        : body.contentType && body.contentId
          ? [{ contentType: body.contentType, contentId: body.contentId }]
          : [];

    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!identity) missing.push("identity");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "至少需要一个标记项。", code: "NO_ITEMS" },
        { status: 400 }
      );
    }

    // Validate content types
    for (const item of rawItems) {
      if (!VALID_CONTENT_TYPES.includes(item.contentType as ReadContentType)) {
        return NextResponse.json(
          { ok: false, error: `contentType 无效: ${item.contentType}`, code: "INVALID_CONTENT_TYPE" },
          { status: 400 }
        );
      }
      if (!item.contentId || typeof item.contentId !== "string") {
        return NextResponse.json(
          { ok: false, error: "contentId 缺失或无效。", code: "MISSING_CONTENT_ID" },
          { status: 400 }
        );
      }
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const rows = rawItems.map((item) => ({
      space_code: spaceCode,
      content_type: item.contentType,
      content_id: item.contentId,
      identity,
      read_at: now,
      updated_at: now,
    }));

    // Upsert using onConflict
    const { data: inserted, error: upsertError } = await supabase
      .from("content_reads")
      .upsert(rows, {
        onConflict: "space_code,content_type,content_id,identity",
        ignoreDuplicates: false,
      })
      .select("content_type, content_id, identity, read_at");

    if (upsertError) {
      const safeError = toSafeApiError(upsertError, "READ_STATE_UPSERT_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "upserted",
      reads: (inserted || []).map((r: Record<string, unknown>) => ({
        contentType: r.content_type,
        contentId: r.content_id,
        identity: r.identity,
        readAt: r.read_at,
      })),
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "READ_STATE_UPSERT_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── DELETE /api/read-state (admin use only — clears read state for an identity in a space) ───
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true, defaultSide: "owner" });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;

    if (!spaceCode || !identity) {
      return NextResponse.json(
        { ok: false, error: "缺少 spaceCode 或 identity。", code: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置。" },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);
    if (!space) {
      return NextResponse.json(
        { ok: false, error: "空间未找到。", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("content_reads")
      .delete()
      .eq("space_code", spaceCode)
      .eq("identity", identity);

    if (deleteError) {
      const safeError = toSafeApiError(deleteError, "READ_STATE_DELETE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "deleted" });
  } catch (err) {
    const safeError = toSafeApiError(err, "READ_STATE_DELETE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}
