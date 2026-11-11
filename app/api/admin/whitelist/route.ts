import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { setWhitelist } from "@/lib/whitelist";
import { findOrCreateByDiscordId } from "@/lib/users";

const schema = z.object({
  discordId: z.string().regex(/^\d{17,20}$/),
  on: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});

/** Manually add or remove whitelist (syncs the Discord role). */
export const POST = route(async (req) => {
  const actor = await requireStaff("whitelist.manage");
  const body = await parseBody(req, schema);
  const user = await findOrCreateByDiscordId(body.discordId);
  await setWhitelist(user.id, body.on, actor.id, body.reason);
  return NextResponse.json({ ok: true, userId: user.id });
});
