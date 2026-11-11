import { NextResponse } from "next/server";
import { route, clientIp } from "@/lib/api";
import { getServerStatus } from "@/lib/fivem";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await rateLimit("status", clientIp(req), 60, "1 m");
  const status = await getServerStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
});
