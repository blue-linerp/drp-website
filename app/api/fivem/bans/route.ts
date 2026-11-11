import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { verifyFivemRequest } from "@/lib/fivem-auth";

export const dynamic = "force-dynamic";

/** Active bans with identifiers, cached by the resource for when the site is unreachable. */
export const GET = route(async (req) => {
  verifyFivemRequest(req);
  const bans = await db.ban.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: { user: { select: { discordId: true, fivemLicense: true, steamHex: true, fivemId: true } } },
  });
  return NextResponse.json({
    bans: bans.map((b) => ({
      reason: b.reason,
      expiresAt: b.expiresAt ? Math.floor(b.expiresAt.getTime() / 1000) : null,
      discordId: b.user.discordId,
      license: b.user.fivemLicense,
      steam: b.user.steamHex,
      fivem: b.user.fivemId,
    })),
  });
});
