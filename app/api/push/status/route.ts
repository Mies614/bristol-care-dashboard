import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push";

export async function GET() {
  const config = getVapidConfig();

  return NextResponse.json({
    ok: true,
    supportedByServer: config.configured,
    publicKeyExists: !!config.publicKey,
    publicKey: config.publicKey || undefined
  });
}