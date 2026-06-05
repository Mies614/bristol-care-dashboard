import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { toSafeApiError } from "@/lib/apiError";

function getDefaultCode(): string {
  return getDefaultSpaceCodeServer();
}

/**
 * Helper: after creating/removing an interaction, count all interactions
 * for this content item and return a full summary (likes + reactions).
 */
async function buildFullSummaryResponse(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  spaceId: string,
  contentType: string,
  contentId: string,
  identity: string,
  base: Record<string, unknown>
): Promise<NextResponse> {
  const { data: allInteractions, error: countError } = await supabase
    .from("content_interactions")
    .select("identity, interaction_type, reaction")
    .eq("space_id", spaceId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (countError) {
    const safeError = toSafeApiError(countError, "SUMMARY_FETCH_FAILED");
    return NextResponse.json({ ...base, ...safeError }, { status: 500 });
  }

  type InteractionRow = { identity: string; interaction_type: string; reaction: string | null };
  const items = (allInteractions || []) as InteractionRow[];

  // Likes
  const likeItems = items.filter((i) => i.interaction_type === "like");
  const likeCount = likeItems.length;
  const liked = likeItems.some((i) => i.identity === identity);

  // Reactions
  const reactionItems = items.filter((i) => i.interaction_type === "reaction" && i.reaction);
  const reactionCounts: Record<string, number> = {};
  const reactionActive: Record<string, boolean> = {};
  for (const r of reactionItems) {
    const key = r.reaction!;
    reactionCounts[key] = (reactionCounts[key] || 0) + 1;
    if (r.identity === identity) {
      reactionActive[key] = true;
    }
  }
  const reactions: Record<string, { count: number; active: boolean }> = {};
  for (const [key, count] of Object.entries(reactionCounts)) {
    reactions[key] = { count, active: reactionActive[key] || false };
  }

  // Comment count
  let commentCount = 0;
  const { count: ccCount, error: ccError } = await supabase
    .from("content_comments")
    .select("*", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .is("deleted_at", null);
  if (!ccError && ccCount !== null) {
    commentCount = ccCount;
  }

  return NextResponse.json({
    ...base,
    liked,
    likeCount,
    commentCount,
    reactions,
  });
}

const VALID_CONTENT_TYPES = ["note", "album", "memory"] as const;
const VALID_INTERACTION_TYPES = ["read", "like", "reaction"] as const;

// ─── GET /api/interactions ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceCode = searchParams.get("spaceCode") || searchParams.get("code") || getDefaultCode();
    const contentType = searchParams.get("contentType");
    const contentIdsRaw = searchParams.get("contentIds");
    const identity = searchParams.get("identity") || DEFAULT_NORMAL_IDENTITY_ID;

    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!contentType) missing.push("contentType");
    if (!contentIdsRaw) missing.push("contentIds");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    const contentIds = (contentIdsRaw as string).split(",").map((s) => s.trim()).filter(Boolean);
    if (contentIds.length === 0 || contentIds.length > 100) {
      return NextResponse.json(
        { ok: false, error: "contentIds 数量应在 1-100 之间。", code: "INVALID_CONTENT_IDS_COUNT" },
        { status: 400 }
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

    // Fetch interactions — use space_id (UUID), not space_code (text)
    const { data: interactions, error: interactionsError } = await supabase
      .from("content_interactions")
      .select("*")
      .eq("space_id", space.id)
      .eq("content_type", contentType)
      .in("content_id", contentIds);

    if (interactionsError) {
      const safeError = toSafeApiError(interactionsError, "INTERACTIONS_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    // Comment counts
    const { data: commentCounts, error: commentCountError } = await supabase
      .from("content_comments")
      .select("content_id")
      .eq("space_id", space.id)
      .eq("content_type", contentType)
      .in("content_id", contentIds)
      .is("deleted_at", null);

    const commentCountMap: Record<string, number> = {};
    if (!commentCountError && commentCounts) {
      for (const row of commentCounts) {
        const cid = row.content_id as string;
        commentCountMap[cid] = (commentCountMap[cid] || 0) + 1;
      }
    }

    const summaries: Record<string, {
      readCount: number;
      hasRead: boolean;
      likeCount: number;
      hasLiked: boolean;
      commentCount: number;
      reactions: Record<string, { count: number; active: boolean }>;
    }> = {};

    for (const contentId of contentIds) {
      const itemInteractions = (interactions || []).filter(
        (i: Record<string, unknown>) => i.content_id === contentId
      );

      const readCount = itemInteractions.filter((i: Record<string, unknown>) => i.interaction_type === "read").length;
      const hasRead = itemInteractions.some((i: Record<string, unknown>) => i.interaction_type === "read" && i.identity === identity);
      const likeCount = itemInteractions.filter((i: Record<string, unknown>) => i.interaction_type === "like").length;
      const hasLiked = itemInteractions.some((i: Record<string, unknown>) => i.interaction_type === "like" && i.identity === identity);

      const reactionCounts: Record<string, number> = {};
      const reactionActive: Record<string, boolean> = {};
      for (const r of itemInteractions.filter((i: Record<string, unknown>) => i.interaction_type === "reaction")) {
        const reactionVal: string = (r.reaction as string) || "";
        if (!reactionVal) continue;
        reactionCounts[reactionVal] = (reactionCounts[reactionVal] || 0) + 1;
        if (r.identity === identity) reactionActive[reactionVal] = true;
      }

      const reactions: Record<string, { count: number; active: boolean }> = {};
      for (const [key, count] of Object.entries(reactionCounts)) {
        reactions[key] = { count, active: reactionActive[key] || false };
      }

      summaries[contentId] = { readCount, hasRead, likeCount, hasLiked, commentCount: commentCountMap[contentId] || 0, reactions };
    }

    return NextResponse.json({
      ok: true,
      summaries,
      interactions: (interactions || []).map((i: Record<string, unknown>) => ({
        id: i.id,
        spaceId: i.space_id,
        contentType: i.content_type,
        contentId: i.content_id,
        identity: i.identity,
        interactionType: i.interaction_type,
        reaction: i.reaction || undefined,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      })),
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "INTERACTIONS_FETCH_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── POST /api/interactions ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const spaceCode = body.spaceCode || body.code || getDefaultCode();
    const contentType = body.contentType as string;
    const contentId = body.contentId as string;
    const interactionType = body.interactionType as string;
    const reaction = body.reaction as string | undefined;
    const identity = (body.identity as string) || DEFAULT_NORMAL_IDENTITY_ID;

    const missing: string[] = [];
    if (!spaceCode) missing.push("spaceCode");
    if (!contentType) missing.push("contentType");
    if (!contentId) missing.push("contentId");
    if (!interactionType) missing.push("interactionType");

    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "缺少必需参数。", code: "MISSING_REQUIRED_PARAMS", missing },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "contentType 无效。", code: "INVALID_CONTENT_TYPE" },
        { status: 400 }
      );
    }

    if (!VALID_INTERACTION_TYPES.includes(interactionType as typeof VALID_INTERACTION_TYPES[number])) {
      return NextResponse.json(
        { ok: false, error: "interactionType 无效。", code: "INVALID_INTERACTION_TYPE" },
        { status: 400 }
      );
    }

    if (interactionType === "reaction" && !reaction) {
      return NextResponse.json(
        { ok: false, error: "reaction 类型需要提供 reaction 值。", code: "MISSING_REACTION_VALUE" },
        { status: 400 }
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

    let checkQuery = supabase
      .from("content_interactions")
      .select("*")
      .eq("space_id", space.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("identity", identity)
      .eq("interaction_type", interactionType);

    if (reaction) {
      checkQuery = checkQuery.eq("reaction", reaction);
    } else {
      checkQuery = checkQuery.is("reaction", null);
    }

    const { data: existing, error: checkError } = await checkQuery;

    if (checkError) {
      const safeError = toSafeApiError(checkError, "INTERACTIONS_CHECK_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    const now = new Date().toISOString();

    if (existing && existing.length > 0) {
      if (interactionType === "read") {
        return await buildFullSummaryResponse(supabase, space.id, contentType, contentId, identity, {
          ok: true,
          action: "kept",
          interaction: {
            id: existing[0].id,
            contentType: existing[0].content_type,
            contentId: existing[0].content_id,
            identity: existing[0].identity,
            interactionType: existing[0].interaction_type,
            reaction: existing[0].reaction,
            createdAt: existing[0].created_at,
            updatedAt: existing[0].updated_at,
          },
        });
      }

      const { error: deleteError } = await supabase
        .from("content_interactions")
        .delete()
        .eq("id", existing[0].id);

      if (deleteError) {
        const safeError = toSafeApiError(deleteError, "INTERACTIONS_DELETE_FAILED");
        return NextResponse.json(safeError, { status: 500 });
      }

      return await buildFullSummaryResponse(supabase, space.id, contentType, contentId, identity, {
        ok: true,
        action: "removed",
        interaction: { contentType, contentId, identity, interactionType, reaction: reaction || undefined },
        liked: false,
        likeCount: undefined,
      });
    }

    // Insert new
    const insertPayload: Record<string, unknown> = {
      space_id: space.id,
      content_type: contentType,
      content_id: contentId,
      identity,
      interaction_type: interactionType,
      created_at: now,
      updated_at: now,
    };
    if (reaction) {
      insertPayload.reaction = reaction;
    }

    const { data: newInteraction, error: insertError } = await supabase
      .from("content_interactions")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !newInteraction) {
      const safeError = toSafeApiError(insertError, "INTERACTIONS_CREATE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return await buildFullSummaryResponse(supabase, space.id, contentType, contentId, identity, {
      ok: true,
      action: "created",
      interaction: {
        id: newInteraction.id,
        contentType: newInteraction.content_type,
        contentId: newInteraction.content_id,
        identity: newInteraction.identity,
        interactionType: newInteraction.interaction_type,
        reaction: newInteraction.reaction || undefined,
        createdAt: newInteraction.created_at,
        updatedAt: newInteraction.updated_at,
      },
      liked: true,
      likeCount: undefined,
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "INTERACTIONS_CREATE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── DELETE /api/interactions ───
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const spaceCode = body.spaceCode || body.code || getDefaultCode();
    const contentType = body.contentType as string;
    const contentId = body.contentId as string;
    const interactionType = body.interactionType as string;
    const reaction = body.reaction as string | undefined;
    const identity = (body.identity as string) || DEFAULT_NORMAL_IDENTITY_ID;

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置，本地模式可用。" },
        { status: 503 }
      );
    }

    if (!contentType || !contentId || !interactionType) {
      return NextResponse.json(
        { ok: false, error: "必须提供 contentType, contentId 和 interactionType。", code: "MISSING_PARAMS" },
        { status: 400 }
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

    const query = supabase
      .from("content_interactions")
      .delete()
      .eq("space_id", space.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("identity", identity)
      .eq("interaction_type", interactionType);

    if (reaction) {
      query.eq("reaction", reaction);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      const safeError = toSafeApiError(deleteError, "INTERACTIONS_DELETE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "deleted",
      contentType,
      contentId,
      identity,
      interactionType,
      reaction: reaction || undefined,
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "INTERACTIONS_DELETE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}