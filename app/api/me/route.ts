import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getQueueRoles } from "@/lib/queue-roles";
import { route } from "@/lib/api";
import { accessFor, activeBan, priorityFor } from "@/lib/session";
import { ensureFresh, syncMember } from "@/lib/sync";
import { discordAvatarUrl } from "@/lib/utils";
import { getQueueSnapshot } from "@/lib/fivem";
import { queuePosition } from "@/lib/priority";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Current user + whitelist + priority + roles. Re-syncs guild roles if older than 5 minutes (?sync=1 forces it). */
export const GET = route(async (req) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ user: null });
  let user = await db.user.findUnique({ where: { id: session.user.id }, include: { supporterTier: true } });
  if (!user) return NextResponse.json({ user: null });

  if (new URL(req.url).searchParams.get("sync") === "1") {
    await rateLimit("me-sync", user.id, 6, "1 m");
    await syncMember(user);
  } else {
    await ensureFresh(user);
  }
  user = (await db.user.findUnique({ where: { id: user.id }, include: { supporterTier: true } }))!;

  const access = accessFor(user);
  const [ban, wlApp, snap] = await Promise.all([
    activeBan(user.id),
    db.application.findFirst({
      where: { userId: user.id, type: { grantsWhitelist: true } },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, reference: true },
    }),
    getQueueSnapshot(),
  ]);

  let queue: { position: number; length: number } | null = null;
  if (snap) {
    const pos = queuePosition(snap.queue, (e) => (!!user!.fivemLicense && e.license === user!.fivemLicense) || e.discordId === user!.discordId);
    if (pos) queue = { position: pos, length: snap.queue.length };
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        discordId: user.discordId,
        displayName: user.globalName || user.username,
        avatarUrl: discordAvatarUrl(user.discordId, user.avatar, 64),
        inGuild: user.inGuild,
        whitelisted: user.whitelisted,
        isStaff: access.level !== null,
        staffLevel: access.level,
        priority: priorityFor(user, await getQueueRoles()),
        tier: user.supporterTier ? { name: user.supporterTier.name, color: user.supporterTier.color, priority: user.supporterTier.priority } : null,
        ban: ban ? { reason: ban.reason, expiresAt: ban.expiresAt?.toISOString() ?? null } : null,
        license: user.fivemLicense,
        pendingWhitelistApp: wlApp && ["PENDING", "UNDER_REVIEW", "INTERVIEW", "DENIED"].includes(wlApp.status) ? wlApp : null,
        queue,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
