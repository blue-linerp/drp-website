import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { verifyFivemRequest } from "@/lib/fivem-auth";
import { priorityFor } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Whitelisted players + priority, refreshed by the resource every 5 minutes.
 * Used as a fallback when /api/fivem/check can't be reached, so a site outage
 * doesn't lock regulars out of the city.
 */
export const GET = route(async (req) => {
  verifyFivemRequest(req);
  const users = await db.user.findMany({ where: { whitelisted: true, inGuild: true }, include: { supporterTier: true } });
  return NextResponse.json({
    generatedAt: Math.floor(Date.now() / 1000),
    players: users.map((u) => ({ discordId: u.discordId, license: u.fivemLicense, priority: priorityFor(u).total, name: u.globalName || u.username })),
  });
});
