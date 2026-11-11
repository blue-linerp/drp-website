import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, unknown> = {},
) {
  await db.auditLog.create({
    data: { actorId, action, targetType, targetId, meta: meta as Prisma.InputJsonValue },
  });
}
