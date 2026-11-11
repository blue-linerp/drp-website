/**
 * Queue priority. The website, the /api/fivem/check response and the Lua queue
 * all use this one formula: base + supporter tier + staff bonus + manual bonus.
 */
export interface PriorityInput {
  supporterPriority?: number | null;
  supporterUntil?: Date | null;
  isStaff?: boolean;
  staffBonus?: number;
  manualBonus?: number | null;
  now?: Date;
}

export interface PriorityBreakdown {
  base: number;
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
  const manual = input.manualBonus ?? 0;
  const total = Math.max(0, BASE_PRIORITY + supporter + staff + manual);
  return { base: BASE_PRIORITY, supporter, staff, manual, total };
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
