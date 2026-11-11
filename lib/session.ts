import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User, SupporterTier } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "./db";
import { env } from "./env";
import { ensureFresh } from "./sync";
import { can, resolveAccess, type Access, type Action } from "./permissions";
import { computePriority, matchQueueRoles, type QueueRoleLike } from "./priority";
import { ApiError } from "./api";

export type CurrentUser = User & { supporterTier: SupporterTier | null; access: Access };

export function accessFor(user: Pick<User, "roleIds">): Access {
  return resolveAccess(user.roleIds, {
    adminRoleIds: env.adminRoleIds,
    seniorStaffRoleIds: env.seniorStaffRoleIds,
    staffRoleIds: env.staffRoleIds,
    deptHeadRoles: env.deptHeadRoles,
  });
}

/**
 * Full queue priority for a user. Pass the configured queue roles (getQueueRoles()) so the
 * player's highest Discord queue role counts. The result also says which role matched and
 * whether the player may use the reserved slots.
 */
export function priorityFor(user: User & { supporterTier: SupporterTier | null }, queueRoles: QueueRoleLike[] = []) {
  const isStaff = accessFor(user).level !== null;
  const match = matchQueueRoles(user.roleIds, queueRoles);
  const breakdown = computePriority({
    supporterPriority: user.supporterTier?.priority,
    supporterUntil: user.supporterUntil,
    isStaff,
    staffBonus: env.staffPriorityBonus,
    manualBonus: user.priorityBonus,
    rolePriority: match.best?.priority,
  });
  return { ...breakdown, roleLabel: match.best?.label ?? null, reserved: isStaff || match.reserved };
}

/** Signed-in user, freshly loaded from the DB (roles re-synced if older than 5 min). Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  let user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;
  user = await ensureFresh(user);
  const tier = user.supporterTierId ? await db.supporterTier.findUnique({ where: { id: user.supporterTierId } }) : null;
  return { ...user, supporterTier: tier, access: accessFor(user) };
});

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new ApiError(401, "Sign in with Discord first.");
  return u;
}

export async function requireStaff(action: Action, ctx?: { department?: string | null }) {
  const u = await requireUser();
  if (!can(u.access, action, ctx)) throw new ApiError(403, "You don't have permission to do that.");
  return u;
}

/** Page variant: redirects instead of throwing. */
export async function requireStaffPage(action: Action = "admin.view") {
  const u = await getCurrentUser();
  if (!u) redirect(`/signin?callbackUrl=/admin`);
  if (!can(u.access, "admin.view")) redirect("/profile?denied=admin");
  if (!can(u.access, action)) redirect("/admin?denied=1");
  return u;
}

export async function activeBan(userId: string) {
  return db.ban.findFirst({
    where: { userId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
  });
}
