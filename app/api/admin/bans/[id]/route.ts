import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { COLORS, postWebhook } from "@/lib/discord";

/** Lift (revoke) a ban. */
export const DELETE = route<{ params: { id: string } }>(async (_req, { params }) => {
  const actor = await requireStaff("bans.manage");
  const ban = await db.ban.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!ban) throw new ApiError(404, "Ban not found");
  await db.ban.update({ where: { id: ban.id }, data: { active: false, revokedAt: new Date() } });
  await audit(actor.id, "ban.revoke", "User", ban.userId, { banId: ban.id });
  await postWebhook(env.logWebhookUrl, {
    embeds: [
      {
        title: "Ban lifted",
        color: COLORS.green,
        fields: [
          { name: "Player", value: `<@${ban.user.discordId}> (${ban.user.username})`, inline: true },
          { name: "Lifted by", value: `<@${actor.discordId}>`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  return NextResponse.json({ ok: true });
});
