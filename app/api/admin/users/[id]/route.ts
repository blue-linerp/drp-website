import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { syncMember } from "@/lib/sync";

const schema = z.object({
  priorityBonus: z.number().int().min(-1000).max(1000).optional(),
  resync: z.boolean().optional(),
});

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const body = await parseBody(req, schema);
  const actor = await requireStaff(body.priorityBonus !== undefined ? "queue.manage" : "users.view");
  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError(404, "User not found");
  if (body.priorityBonus !== undefined) {
    await db.user.update({ where: { id: user.id }, data: { priorityBonus: body.priorityBonus } });
    await audit(actor.id, "user.priority", "User", user.id, { from: user.priorityBonus, to: body.priorityBonus });
  }
  if (body.resync) await syncMember(user);
  return NextResponse.json({ ok: true });
});
