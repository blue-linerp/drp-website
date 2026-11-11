import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, route } from "@/lib/api";
import { botConfigured } from "@/lib/discord";
import { syncMember } from "@/lib/sync";
import { supporterActive } from "@/lib/priority";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 40;

/**
 * Role sync job (every 15 min): whitelist role ↔ DB and supporter tier roles ↔ DB for
 * active users (seen in game or on the site in the last 7 days), oldest sync first.
 * Also expires supporter tiers whose paid period ended without a Tebex event.
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically).
 */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new ApiError(401, "Unauthorized");

  const expired = await db.user.findMany({ where: { supporterTierId: { not: null }, supporterUntil: { lt: new Date() } } });
  for (const u of expired) if (!supporterActive(u.supporterUntil)) await db.user.update({ where: { id: u.id }, data: { supporterTierId: null, supporterUntil: null } });

  if (!botConfigured()) return NextResponse.json({ ok: true, synced: 0, expired: expired.length, note: "Bot not configured" });

  const week = new Date(Date.now() - 7 * 86_400_000);
  const stale = new Date(Date.now() - 15 * 60_000);
  const users = await db.user.findMany({
    where: {
      OR: [{ lastSeenInGame: { gte: week } }, { updatedAt: { gte: week } }, { whitelisted: true }, { supporterTierId: { not: null } }],
      AND: [{ OR: [{ rolesSyncedAt: null }, { rolesSyncedAt: { lt: stale } }] }],
    },
    orderBy: { rolesSyncedAt: { sort: "asc", nulls: "first" } },
    take: BATCH,
  });
  let synced = 0;
  for (const u of users) {
    await syncMember(u);
    synced++;
  }
  return NextResponse.json({ ok: true, synced, expired: expired.length });
});
