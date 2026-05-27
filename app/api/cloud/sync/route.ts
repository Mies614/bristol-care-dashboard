import { NextRequest, NextResponse } from "next/server";
import { cloudUnavailableResponse, fetchCloudDataByCode, getDefaultSpaceCode } from "@/lib/api/cloud";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const result = await fetchCloudDataByCode(String(code || getDefaultSpaceCode()));
    if (!result) return NextResponse.json({ error: "访问码不存在。" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return cloudUnavailableResponse();
    return NextResponse.json({ error: "云同步失败。" }, { status: 500 });
  }
}
