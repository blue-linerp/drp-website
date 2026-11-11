import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

export const QUEUE_ROLES_TAG = "queue-roles";

/** Configured queue roles, highest priority first. Cached; revalidated when staff edit them. */
export const getQueueRoles = unstable_cache(
  async () => {
    try {
      return await db.queueRole.findMany({ orderBy: [{ priority: "desc" }, { order: "asc" }] });
    } catch {
      return [];
    }
  },
  ["queue-roles"],
  { tags: [QUEUE_ROLES_TAG], revalidate: 300 },
);

export function revalidateQueueRoles() {
  revalidateTag(QUEUE_ROLES_TAG);
}
