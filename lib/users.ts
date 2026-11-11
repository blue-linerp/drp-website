import "server-only";
import { db } from "./db";
import { botConfigured, getGuildMember } from "./discord";
import { snowflakeToDate } from "./utils";
import { syncMember } from "./sync";
import { ApiError } from "./api";

/**
 * Staff can act on players who have never signed in to the site (bulk whitelist import,
 * bans by Discord ID). This creates a minimal user from the Discord ID and, if a bot is
 * configured, fills in the name and roles.
 */
export async function findOrCreateByDiscordId(discordId: string) {
  if (!/^\d{17,20}$/.test(discordId)) throw new ApiError(400, `"${discordId}" isn't a Discord user ID.`);
  const existing = await db.user.findUnique({ where: { discordId } });
  if (existing) return existing;
  let member = null;
  if (botConfigured()) member = await getGuildMember(discordId).catch(() => null);
  const user = await db.user.create({
    data: {
      discordId,
      username: member?.user?.username ?? `user-${discordId.slice(-6)}`,
      globalName: member?.user?.global_name ?? null,
      avatar: member?.user?.avatar ?? null,
      discordCreatedAt: snowflakeToDate(discordId),
    },
  });
  return member ? syncMember(user, member) : user;
}
