import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { parseBody, route } from "@/lib/api";
import { bareDiscord, normId, verifyFivemRequest } from "@/lib/fivem-auth";
import { rateLimit } from "@/lib/rate-limit";
import { ensureFresh } from "@/lib/sync";
import { accessFor, priorityFor } from "@/lib/session";
import { supporterActive } from "@/lib/priority";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  license: z.string().min(5).max(80),
  discordId: z.string().max(40).optional().nullable(),
  steam: z.string().max(40).optional().nullable(),
  fivem: z.string().max(40).optional().nullable(),
  ip: z.string().max(64).optional().nullable(),
  name: z.string().max(80).optional().nullable(),
});

type Result = {
  allowed: boolean;
  reason: "ok" | "no_discord" | "not_registered" | "not_in_guild" | "not_whitelisted" | "banned" | "license_conflict";
  message: string;
  priority: number;
  tier: string | null;
  isStaff: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  displayName: string | null;
};

const deny = (reason: Result["reason"], message: string, extra: Partial<Result> = {}): Result => ({
  allowed: false,
  reason,
  message,
  priority: 0,
  tier: null,
  isStaff: false,
  banned: false,
  banReason: null,
  banExpires: null,
  displayName: null,
  ...extra,
});

/**
 * Called by the gate resource on playerConnecting. Links identifiers on first connect,
 * enforces bans (also across linked licence/Steam to catch alts), whitelist and guild
 * membership, and returns the queue priority.
 */
export const POST = route(async (req) => {
  verifyFivemRequest(req);
  await rateLimit("fivem-check", "server", 600, "1 m");
  const body = await parseBody(req, schema);
  const license = normId("license", body.license)!;
  const steam = normId("steam", body.steam);
  const fivem = normId("fivem", body.fivem);
  const discordId = bareDiscord(body.discordId);
  const apply = `${site.url}/applications`;

  // Bans follow identifiers, not just the Discord account.
  const now = new Date();
  const banWhere: Prisma.BanWhereInput = {
    active: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    user: {
      OR: [{ fivemLicense: license }, ...(steam ? [{ steamHex: steam }] : []), ...(fivem ? [{ fivemId: fivem }] : []), ...(discordId ? [{ discordId }] : [])],
    },
  };
  const ban = await db.ban.findFirst({ where: banWhere, orderBy: { createdAt: "desc" } });
  if (ban)
    return NextResponse.json(
      deny("banned", `You are banned: ${ban.reason}${ban.expiresAt ? ` (until ${ban.expiresAt.toUTCString()})` : " (permanent)"}. Appeal at ${site.url}/support`, {
        banned: true,
        banReason: ban.reason,
        banExpires: ban.expiresAt?.toISOString() ?? null,
      }),
    );

  if (!discordId) return NextResponse.json(deny("no_discord", "Open Discord and restart FiveM so we can verify you."));

  let user = await db.user.findUnique({ where: { discordId }, include: { supporterTier: true } });
  if (!user) return NextResponse.json(deny("not_registered", `Not whitelisted. Apply at ${apply}`));

  // Licence already linked to a different Discord account: refuse rather than silently re-link.
  if (!user.fivemLicense || user.fivemLicense !== license) {
    const owner = await db.user.findUnique({ where: { fivemLicense: license }, select: { id: true } });
    if (owner && owner.id !== user.id) {
      await audit(null, "fivem.license_conflict", "User", user.id, { license, ownerId: owner.id });
      return NextResponse.json(deny("license_conflict", `This Rockstar licence is linked to another Discord account. Open a ticket at ${site.url}/support`));
    }
  }

  const link: Prisma.UserUpdateInput = { lastIp: body.ip ?? undefined };
  if (!user.fivemLicense) link.fivemLicense = license;
  if (steam && user.steamHex !== steam) link.steamHex = steam;
  if (fivem && user.fivemId !== fivem) {
    const taken = await db.user.findUnique({ where: { fivemId: fivem }, select: { id: true } });
    if (!taken || taken.id === user.id) link.fivemId = fivem;
  }
  if (!user.fivemLicense) await audit(null, "fivem.link", "User", user.id, { license, steam, fivem });
  await db.user.update({ where: { id: user.id }, data: link });

  // Roles may have changed in Discord since the last sync.
  const synced = await ensureFresh(user);
  user = { ...user, ...synced };

  if (!user.inGuild) return NextResponse.json(deny("not_in_guild", `Join our Discord to play, then reconnect. ${site.discordInvite}`));
  if (!user.whitelisted) return NextResponse.json(deny("not_whitelisted", `Not whitelisted. Apply at ${apply}`));

  const prio = priorityFor(user);
  const result: Result = {
    allowed: true,
    reason: "ok",
    message: "Welcome back to the city.",
    priority: prio.total,
    tier: user.supporterTier && supporterActive(user.supporterUntil) ? user.supporterTier.name : null,
    isStaff: accessFor(user).level !== null,
    banned: false,
    banReason: null,
    banExpires: null,
    displayName: user.globalName || user.username,
  };
  return NextResponse.json(result);
});
