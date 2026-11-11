import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { botConfigured, removeRole } from "@/lib/discord";
import { signOut } from "@/auth";

const schema = z.object({ dmNotifications: z.boolean().optional(), isProfilePublic: z.boolean().optional() }).strict();

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, schema);
  await db.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
});

/**
 * GDPR delete. Active bans keep a stub user (identifiers only) so the ban
 * is still enforced in game; otherwise the user row and everything linked is removed.
 */
export const DELETE = route(async () => {
  const user = await requireUser();
  if (botConfigured() && env.whitelistRoleId && user.whitelisted) {
    await removeRole(user.discordId, env.whitelistRoleId, "Account deleted").catch(() => null);
  }
  const banned = await db.ban.count({ where: { userId: user.id, active: true } });
  if (banned) {
    await db.$transaction([
      db.application.deleteMany({ where: { userId: user.id } }),
      db.applicationDraft.deleteMany({ where: { userId: user.id } }),
      db.character.deleteMany({ where: { userId: user.id } }),
      db.user.update({
        where: { id: user.id },
        data: {
          username: "deleted-user",
          globalName: null,
          avatar: null,
          email: null,
          whitelisted: false,
          whitelistedAt: null,
          isProfilePublic: false,
          dmNotifications: false,
          supporterTierId: null,
          supporterUntil: null,
        },
      }),
    ]);
  } else {
    await db.user.delete({ where: { id: user.id } });
  }
  await audit(null, "user.delete.self", "User", banned ? user.id : null, { discordId: user.discordId, keptForBan: !!banned });
  await signOut({ redirect: false });
  return NextResponse.json({ ok: true });
});
