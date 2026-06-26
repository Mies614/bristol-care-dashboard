import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." },
        { status: 503 },
      );
    }

    const contextResult = resolveRequestContext(request);
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode } = contextResult.context;

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("user_identities")
      .select("id, space_code, display_name, role, avatar_emoji, is_default, created_at, updated_at")
      .eq("space_code", spaceCode)
      .order("created_at", { ascending: true });

    if (error) {
      const safeError = toSafeApiError(error, "IDENTITIES_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      identities: (data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ""),
        displayName: String(row.display_name ?? ""),
        role: String(row.role ?? "partner"),
        avatarEmoji: row.avatar_emoji ? String(row.avatar_emoji) : undefined,
        isDefault: Boolean(row.is_default),
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
      })),
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "IDENTITIES_FETCH_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode } = contextResult.context;

    const identityId = String(body.id ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "partner").trim();
    const avatarEmoji = body.avatarEmoji ? String(body.avatarEmoji).trim() : null;
    const isDefault = Boolean(body.isDefault);

    if (!identityId || !displayName) {
      return NextResponse.json(
        { ok: false, error: "id and displayName are required.", code: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    if (role === "admin") {
      return NextResponse.json(
        { ok: false, error: "Cannot set role to admin via API.", code: "ADMIN_ELEVATION_FORBIDDEN" },
        { status: 403 },
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase.from("user_identities").upsert(
      {
        id: identityId,
        space_code: spaceCode,
        display_name: displayName,
        role,
        avatar_emoji: avatarEmoji,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "space_code,id" },
    );

    if (error) {
      const safeError = toSafeApiError(error, "IDENTITY_SAVE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "saved" });
  } catch (err) {
    const safeError = toSafeApiError(err, "IDENTITY_SAVE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode } = contextResult.context;

    const identityId = String(body.id ?? "").trim();
    if (!identityId) {
      return NextResponse.json(
        { ok: false, error: "id is required.", code: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    if (["xiaoguai", "me", "admin"].includes(identityId)) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete built-in identity.", code: "BUILTIN_DELETE_FORBIDDEN" },
        { status: 403 },
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("user_identities")
      .delete()
      .eq("space_code", spaceCode)
      .eq("id", identityId);

    if (error) {
      const safeError = toSafeApiError(error, "IDENTITY_DELETE_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "deleted" });
  } catch (err) {
    const safeError = toSafeApiError(err, "IDENTITY_DELETE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}
