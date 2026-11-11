import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { findOrCreateByDiscordId } from "@/lib/users";
import { sendDM } from "@/lib/discord";
import { site } from "@/lib/site";

const schema = z.object({
  discordId: z.string().regex(/^\d{17,20}$/),
  reason: z.string().trim().min(3).max(1000),
  points: z.number().int().min(0).max(1000),
});

export const POST = route(async (req) => {
  const actor = await requireStaff("bans.manage");
  const body = await parseBody(req, schema);
  const user = await findOrCreateByDiscordId(body.discordId);
  const w = await db.warning.create({ data: { userId: user.id, reason: body.reason, points: body.points, issuedById: actor.id } });
  await audit(actor.id, "warning.create", "User", user.id, { warningId: w.id, points: body.points, reason: body.reason });
  if (user.dmNotifications)
    await sendDM(user.discordId, {
      embeds: [{ title: `You received a warning on ${site.shortName}`, description: `**${body.points} points**\n${body.reason}\n\nSee your record at ${site.url}/profile`, color: 0xffb020 }],
    });
  return NextResponse.json({ id: w.id }, { status: 201 });
});
