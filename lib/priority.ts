/**
 * Queue priority. The website, the /api/fivem/check response and the Lua queue all use
 * this one formula:
 *   base + highest queue role + supporter tier + staff bonus + manual bonus
 */
export interface PriorityInput {
  supporterPriority?: number | null;
  supporterUntil?: Date | null;
  isStaff?: boolean;
  staffBonus?: number;
  manualBonus?: number | null;
  /** Points from the player's highest matching queue role (see matchQueueRoles). */
  rolePriority?: number | null;
  now?: Date;
}

export interface PriorityBreakdown {
  base: number;
  role: number;
  supporter: number;
  staff: number;
  manual: number;
  total: number;
}

export const BASE_PRIORITY = 0;

export function supporterActive(until: Date | null | undefined, now = new Date()) {
  // No expiry recorded = active until a Tebex cancel/expire webhook clears the tier.
  return !until || until.getTime() > now.getTime();
}

export function computePriority(input: PriorityInput): PriorityBreakdown {
  const now = input.now ?? new Date();
  const supporter =
    input.supporterPriority && supporterActive(input.supporterUntil, now) ? Math.max(0, input.supporterPriority) : 0;
  const staff = input.isStaff ? Math.max(0, input.staffBonus ?? 0) : 0;
  const role = Math.max(0, input.rolePriority ?? 0);
  const manual = input.manualBonus ?? 0;
  const total = Math.max(0, BASE_PRIORITY + role + supporter + staff + manual);
  return { base: BASE_PRIORITY, role, supporter, staff, manual, total };
}

export interface QueueRoleLike {
  discordRoleId: string;
  label: string;
  priority: number;
  reservedSlot: boolean;
}

export interface QueueRoleMatch<R extends QueueRoleLike = QueueRoleLike> {
  /** Highest-priority role the player holds, or null. Roles don't stack. */
  best: R | null;
  /** Every queue role the player holds, highest first. */
  all: R[];
  /** True when any held role may use the reserved slots. */
  reserved: boolean;
}

export function matchQueueRoles<R extends QueueRoleLike>(roleIds: string[], roles: R[]): QueueRoleMatch<R> {
  const all = roles.filter((r) => roleIds.includes(r.discordRoleId)).sort((a, b) => b.priority - a.priority);
  return { best: all[0] ?? null, all, reserved: all.some((r) => r.reservedSlot) };
}

export interface QueueItem {
  priority: number;
  joinedAt: number;
}

/** Highest priority first, then earliest join. Stable and non-mutating. */
export function sortQueue<T extends QueueItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priority - a.priority || a.joinedAt - b.joinedAt);
}

/** 1-based position, or null when not in the queue. */
export function queuePosition<T extends QueueItem>(items: T[], match: (item: T) => boolean): number | null {
  const idx = sortQueue(items).findIndex(match);
  return idx === -1 ? null : idx + 1;
}
