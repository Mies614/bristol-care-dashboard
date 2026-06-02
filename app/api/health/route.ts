export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

interface EnvCheck {
  key: string;
  status: "configured" | "missing" | "unavailable";
  description: string;
}

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  env: EnvCheck[];
  runtime: {
    nodeEnv: string;
    timezone: string;
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: EnvCheck[] = [];

  function addCheck(key: string, description: string) {
    const value = process.env[key];
    let status: EnvCheck["status"];
    if (value === undefined || value === null) {
      status = "unavailable";
    } else if (value === "") {
      status = "missing";
    } else {
      status = "configured";
    }
    checks.push({ key, status, description });
  }

  // Required: Supabase
  addCheck("NEXT_PUBLIC_SUPABASE_URL", "Supabase 项目地址");
  addCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase 匿名密钥");

  // Required: Admin
  addCheck("ADMIN_PASSWORD", "后台管理密码");

  // Required: Space code
  addCheck("NEXT_PUBLIC_DEFAULT_SPACE_CODE", "默认空间访问码");

  // Optional: VAPID for push notifications
  addCheck("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Web Push 公钥");
  addCheck("VAPID_PRIVATE_KEY", "Web Push 私钥");

  // Optional: Supabase service role (server-side only)
  addCheck("SUPABASE_SERVICE_ROLE_KEY", "Supabase 服务端密钥（仅服务端）");

  // Service status (derived from Supabase config)
  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

  const hasPush = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

  checks.push({
    key: "SERVICE_SUPABASE",
    status: hasSupabase ? "configured" : "missing",
    description: "Supabase 云存储可用性",
  });

  checks.push({
    key: "SERVICE_PUSH",
    status: hasPush ? "configured" : "missing",
    description: "Web Push 通知可用性",
  });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: checks,
    runtime: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
}
