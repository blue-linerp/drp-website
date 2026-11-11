import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getLiveStreams } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const streams = await getLiveStreams();
  return NextResponse.json({ streams }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } });
});
