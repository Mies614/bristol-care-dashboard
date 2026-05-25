import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (!validateAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: "后台密码不正确。" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
