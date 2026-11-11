import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { findOrCreateByDiscordId } from "@/lib/users";
import { COLORS, postWebhook } from "@/lib/discord";

const schema = z.object({
  discordId: z.string().regex(/^\d{17,20}$/),
  reason: z.string().trim().min(3).max(1000),
  points: z.number().int().min(0).max(1000),
  /** Hours; omit or null for a permanent ban. */
  durationHours: z.number().int().min(1).max(24 * 3650).nullable().optional(),
});

/** Issue a temp or permanent ban. The FiveM resource picks it up on next check/heartbeat and drops the player. */
export const POST = route(async (req) => {
  const actor = await requireStaff("bans.manage");
  const body = await parseBody(req, schema);
  const user = await findOrCreateByDiscordId(body.discordId);
  const expiresAt = body.durationHours ? new Date(Date.now() + body.durationHours * 3_600_000) : null;
  const ban = await db.ban.create({ data: { userId: user.id, reason: body.reason, points: body.points, expiresAt, issuedById: actor.id } });
  await audit(actor.id, "ban.create", "User", user.id, { banId: ban.id, reason: body.reason, points: body.points, expiresAt });
  await postWebhook(env.logWebhookUrl, {
    embeds: [
      {
        title: expiresAt ? "Temporary ban" : "Permanent ban",
        color: COLORS.red,
        fields: [
          { name: "Player", value: `<@${user.discordId}> (${user.username})`, inline: true },
          { name: "Issued by", value: `<@${actor.discordId}>`, inline: true },
          { name: "Points", value: String(body.points), inline: true },
          { name: "Expires", value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>` : "Never", inline: true },
          { name: "Reason", value: body.reason.slice(0, 1000) },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  return NextResponse.json({ id: ban.id }, { status: 201 });
});
