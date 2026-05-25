import { NextRequest, NextResponse } from "next/server";
import { cloudUnavailableResponse, fetchCloudDataByCode } from "@/lib/api/cloud";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: "缺少访问码。" }, { status: 400 });
    const result = await fetchCloudDataByCode(String(code));
    if (!result) return NextResponse.json({ error: "访问码不存在。" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return cloudUnavailableResponse();
    return NextResponse.json({ error: "云同步失败。" }, { status: 500 });
  }
}
