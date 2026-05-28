export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    route: "/api/ping",
    time: new Date().toISOString()
  });
}