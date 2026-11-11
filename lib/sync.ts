import "server-only";
import type { Prisma, User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { addRole, botConfigured, getGuildMember, removeRole, type GuildMember } from "./discord";
import { supporterActive } from "./priority";
import { audit } from "./audit";

export const ROLE_SYNC_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Pull guild membership + roles from Discord and reconcile:
 *  - Whitelist: DB flag and the Discord role must agree. A role added by hand in Discord
 *    grants; a role removed in Discord (or leaving the guild) revokes.
 *    Website-initiated changes go through setWhitelist(), which writes Discord first.
 *  - Supporter tier roles: the DB (fed by Tebex) is the source of truth; roles follow it.
 */
export async function syncMember(user: User, member?: GuildMember | null): Promise<User> {
  if (!env.guildId && member === undefined) return user;
  if (member === undefined) {
    if (!botConfigured()) return user;
    try {
      member = await getGuildMember(user.discordId);
    } catch (e) {
      console.warn("[sync] member fetch failed", user.discordId, (e as Error).message);
      return user; // transient error: never revoke on uncertainty
    }
  }

  const roleIds = member?.roles ?? [];
  const data: Prisma.UserUncheckedUpdateInput = {
    inGuild: !!member,
    roleIds,
    guildJoinedAt: member ? new Date(member.joined_at) : null,
    rolesSyncedAt: new Date(),
  };
  if (member?.user) {
    data.username = member.user.username;
    data.globalName = member.user.global_name ?? null;
    data.avatar = member.user.avatar ?? null;
  }

  const wlRole = env.whitelistRoleId;
  if (wlRole) {
    const hasRole = roleIds.includes(wlRole);
    if (hasRole && !user.whitelisted) {
      data.whitelisted = true;
      data.whitelistedAt = new Date();
      await audit(null, "whitelist.grant.discord", "User", user.id, { via: "Discord role added manually" });
    } else if (!hasRole && user.whitelisted) {
      data.whitelisted = false;
      data.whitelistedAt = null;
      await audit(null, "whitelist.revoke.discord", "User", user.id, {
        via: member ? "Discord role removed" : "Left the Discord server",
      });
    }
  }

  const updated = await db.user.update({ where: { id: user.id }, data });
  if (member && botConfigured()) await reconcileSupporterRoles(updated, roleIds);
  return updated;
}

export async function reconcileSupporterRoles(user: User, roleIds: string[]) {
  const tiers = await db.supporterTier.findMany({ where: { discordRoleId: { not: null } } });
  const active = user.supporterTierId && supporterActive(user.supporterUntil) ? user.supporterTierId : null;
  for (const t of tiers) {
    const should = t.id === active;
    const has = roleIds.includes(t.discordRoleId!);
    try {
      if (should && !has) await addRole(user.discordId, t.discordRoleId!, `Supporter tier ${t.name}`);
      if (!should && has) await removeRole(user.discordId, t.discordRoleId!, `Supporter tier ${t.name} ended`);
    } catch (e) {
      console.warn("[sync] supporter role", t.name, (e as Error).message);
    }
  }
}

/** Re-sync if roles are older than maxAge. Safe to call on every request. */
export async function ensureFresh(user: User, maxAgeMs = ROLE_SYNC_MAX_AGE_MS) {
  if (user.rolesSyncedAt && Date.now() - user.rolesSyncedAt.getTime() < maxAgeMs) return user;
  return syncMember(user);
}
