import { NextRequest, NextResponse } from "next/server";
import { cloudUnavailableResponse, getSpaceByCode } from "@/lib/api/cloud";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: "缺少访问码。" }, { status: 400 });
    const space = await getSpaceByCode(String(code));
    if (!space) return NextResponse.json({ error: "访问码不存在。" }, { status: 404 });
    return NextResponse.json({
      space: {
        code: space.code,
        name: space.name,
        girlfriendName: space.girlfriend_name || "小乖"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return cloudUnavailableResponse();
    return NextResponse.json({ error: "云同步查询失败。" }, { status: 500 });
  }
}
