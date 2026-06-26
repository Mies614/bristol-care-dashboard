import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

const VALID_LOCATION_IDENTITIES = new Set(["me", DEFAULT_NORMAL_IDENTITY_ID]);

// ─── GET /api/location?spaceCode=...&identity=... ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextResult = resolveRequestContext(request, {
      spaceCode: searchParams.get("spaceCode"),
      code: searchParams.get("code"),
    });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode } = contextResult.context;
    const identity = searchParams.get("identity") || DEFAULT_NORMAL_IDENTITY_ID;

    if (!spaceCode || !identity) {
      return NextResponse.json(
        { ok: false, error: "缺少 spaceCode 或 identity。", code: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    if (!VALID_LOCATION_IDENTITIES.has(identity)) {
      return NextResponse.json(
        { ok: false, error: "identity 无效。", code: "INVALID_IDENTITY" },
        { status: 400 },
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase 未配置。" },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: location, error } = await supabase
      .from("space_locations")
      .select("identity, latitude, longitude, accuracy, city, region, country, updated_at")
      .eq("space_code", spaceCode)
      .eq("identity", identity)
      .maybeSingle();

    if (error) {
      const safeError = toSafeApiError(error, "LOCATION_FETCH_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    if (!location) {
      return NextResponse.json({
        ok: true,
        location: null,
      });
    }

    return NextResponse.json({
      ok: true,
      location: {
        identity: location.identity,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        city: location.city || undefined,
        region: location.region || undefined,
        country: location.country || undefined,
        updatedAt: location.updated_at,
      },
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "LOCATION_FETCH_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── POST /api/location ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode, identity } = contextResult.context;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracy = body.accuracy != null ? Number(body.accuracy) : undefined;
    const city = body.city as string | undefined;
    const region = body.region as string | undefined;
    const country = body.country as string | undefined;

    if (!spaceCode || !identity) {
      return NextResponse.json(
        { ok: false, error: "缺少 spaceCode 或 identity。", code: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { ok: false, error: "缺少有效的经纬度。", code: "INVALID_COORDINATES" },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { ok: false, error: "经纬度范围不正确。", code: "INVALID_COORDINATE_RANGE" },
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
    const now = new Date().toISOString();

    const { data: location, error } = await supabase
      .from("space_locations")
      .upsert(
        {
          space_code: spaceCode,
          identity,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          city: city || null,
          region: region || null,
          country: country || null,
          updated_at: now,
        },
        { onConflict: "space_code,identity" }
      )
      .select("identity, latitude, longitude, accuracy, city, region, country, updated_at")
      .single();

    if (error || !location) {
      const safeError = toSafeApiError(error, "LOCATION_UPSERT_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "upserted",
      location: {
        identity: location.identity,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        city: location.city || undefined,
        region: location.region || undefined,
        country: location.country || undefined,
        updatedAt: location.updated_at,
      },
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "LOCATION_UPSERT_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}
