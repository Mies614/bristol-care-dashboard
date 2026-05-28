import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push";
import { getDefaultSpaceCode } from "@/lib/cloudSync";

export async function GET() {
  const envVars = {
    nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
    nextPublicVapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "set" : "missing",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? "set" : "missing",
    vapidSubject: process.env.VAPID_SUBJECT ? "set" : "missing",
    adminPassword: process.env.ADMIN_PASSWORD ? "set" : "missing (optional for non-admin routes)"
  };

  const code = getDefaultSpaceCode();

  return NextResponse.json({
    ok: true,
    env: envVars,
    spaceCode: code,
    push: getVapidConfig()
  });
}