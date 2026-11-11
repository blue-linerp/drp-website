import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { bareDiscord, normId, verifyFivemRequest } from "@/lib/fivem-auth";
import { getState, setState } from "@/lib/settings";
import { priorityFor } from "@/lib/session";
import type { QueueSnapshot } from "@/lib/fivem";
import type { QueueCommands } from "@/lib/fivem";

export const dynamic = "force-dynamic";

const player = z.object({
  license: z.string().min(5).max(80),
  discordId: z.string().max(40).nullish(),
  name: z.string().max(80).nullish(),
  /** The character the player is currently on (Qbox/QBCore citizenid), if loaded. */
  citizenid: z.string().max(40).nullish(),
});
const schema = z.object({
  players: z.array(player).max(2048),
  queue: z
    .array(player.extend({ priority: z.number().int(), joinedAt: z.number(), tier: z.string().max(40).nullish() }))
    .max(2048),
  maxClients: z.number().int().min(0).max(2048).optional(),
});

const MIN = 60_000;
const GAP = 3 * MIN; // longer than this between heartbeats = a new session, no playtime credited

/**
 * Every 30s from the gate resource. Updates last-seen/playtime, stores the queue snapshot for
 * the website, and returns commands: staff queue kicks, players to drop (new bans), and fresh
 * priorities for queued players (manual bonus / tier changes apply without reconnecting).
 */
export const POST = route(async (req) => {
  verifyFivemRequest(req);
  const body = await parseBody(req, schema);
  const now = Date.now();
  const norm = <T extends { license: string; discordId?: string | null }>(p: T) => ({ ...p, license: normId("license", p.license)!, discordId: bareDiscord(p.discordId) });
  const players = body.players.map(norm);
  const queue = body.queue.map(norm);

  // Per-character playtime + last connected, same whole-minute accrual as the account.
  const active = players.filter((p) => p.citizenid);
  if (active.length) {
    const chars = await db.character.findMany({
      where: { citizenid: { in: active.map((p) => p.citizenid!) } },
      select: { id: true, citizenid: true, lastPlayedAt: true, user: { select: { fivemLicense: true } } },
    });
    await Promise.all(
      chars.map((c) => {
        if (!active.some((p) => p.citizenid === c.citizenid && p.license === c.user.fivemLicense)) return null;
        const last = c.lastPlayedAt?.getTime() ?? 0;
        const delta = now - last;
        if (!last || delta > GAP) return db.character.update({ where: { id: c.id }, data: { lastPlayedAt: new Date(now) } });
        const mins = Math.floor(delta / MIN);
        if (mins < 1) return null;
        return db.character.update({ where: { id: c.id }, data: { playtimeMinutes: { increment: mins }, lastPlayedAt: new Date(last + mins * MIN) } });
      }),
    );
  }

  // Last seen + playtime (whole minutes; the remainder carries over via lastSeenInGame).
  const online = players.length
    ? await db.user.findMany({ where: { fivemLicense: { in: players.map((p) => p.license) } }, select: { id: true, lastSeenInGame: true, fivemLicense: true } })
    : [];
  await Promise.all(
    online.map((u) => {
      const last = u.lastSeenInGame?.getTime() ?? 0;
      const delta = now - last;
      if (!last || delta > GAP) return db.user.update({ where: { id: u.id }, data: { lastSeenInGame: new Date(now) } });
      const mins = Math.floor(delta / MIN);
      if (mins < 1) return null;
      return db.user.update({ where: { id: u.id }, data: { playtimeMinutes: { increment: mins }, lastSeenInGame: new Date(last + mins * MIN) } });
    }),
  );

  const snapshot: QueueSnapshot = { updatedAt: now, players, queue, maxClients: body.maxClients };
  await setState("queue", snapshot);

  // Commands for the resource.
  const cmds = await getState<QueueCommands>("queue.commands", { kicks: [] });
  const kicks = cmds.kicks.filter((k) => now - k.at < 10 * MIN);
  if (cmds.kicks.length) await setState("queue.commands", { kicks: [] });

  const licenses = [...players, ...queue].map((p) => p.license);
  const banned = licenses.length
    ? await db.ban.findMany({
        where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(now) } }], user: { fivemLicense: { in: licenses } } },
        include: { user: { select: { fivemLicense: true } } },
      })
    : [];
  const drops = banned.map((b) => ({ license: b.user.fivemLicense!, reason: `Banned: ${b.reason}` }));

  const queuedUsers = queue.length
    ? await db.user.findMany({ where: { fivemLicense: { in: queue.map((q) => q.license) } }, include: { supporterTier: true } })
    : [];
  const priorities: Record<string, number> = {};
  for (const u of queuedUsers) priorities[u.fivemLicense!] = priorityFor(u).total;

  return NextResponse.json({ ok: true, kicks: kicks.map(({ license, reason }) => ({ license, reason })), drops, priorities });
});
