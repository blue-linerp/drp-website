import "server-only";
import { db } from "./db";
import { env } from "./env";
import { addRole, botConfigured, removeRole, postWebhook, COLORS } from "./discord";
import { audit } from "./audit";
import { ApiError } from "./api";

/**
 * Grant or revoke whitelist. Discord is written first so the DB never claims
 * a state the role doesn't reflect. If the bot isn't configured, only the DB changes.
 */
export async function setWhitelist(userId: string, on: boolean, actorId: string | null, reason: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  if (botConfigured() && env.whitelistRoleId) {
    try {
      if (on) await addRole(user.discordId, env.whitelistRoleId, reason);
      else await removeRole(user.discordId, env.whitelistRoleId, reason);
    } catch (e) {
      throw new ApiError(502, `Discord role update failed, so nothing was changed. ${(e as Error).message}`);
    }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      whitelisted: on,
      whitelistedAt: on ? (user.whitelistedAt ?? new Date()) : null,
      roleIds: on
        ? Array.from(new Set([...user.roleIds, env.whitelistRoleId].filter(Boolean)))
        : user.roleIds.filter((r) => r !== env.whitelistRoleId),
    },
  });
  await audit(actorId, on ? "whitelist.grant" : "whitelist.revoke", "User", userId, { reason });
  await postWebhook(env.logWebhookUrl, {
    embeds: [
      {
        title: on ? "Whitelist granted" : "Whitelist removed",
        color: on ? COLORS.green : COLORS.red,
        fields: [
          { name: "Player", value: `<@${user.discordId}> (${user.username})`, inline: true },
          { name: "Reason", value: reason.slice(0, 1000) || "—", inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  return updated;
}
