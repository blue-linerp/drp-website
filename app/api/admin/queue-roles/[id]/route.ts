import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { queueRoleSchema } from "@/lib/admin-queue";
import { revalidateQueueRoles } from "@/lib/queue-roles";

type Ctx = { params: { id: string } };

export const PUT = route<Ctx>(async (req, { params }) => {
  const actor = await requireStaff("queue.manage");
  const body = await parseBody(req, queueRoleSchema);
  const clash = await db.queueRole.findUnique({ where: { discordRoleId: body.discordRoleId } });
  if (clash && clash.id !== params.id) throw new ApiError(409, "That Discord role already has a queue priority.");
  const before = await db.queueRole.findUnique({ where: { id: params.id } });
  if (!before) throw new ApiError(404, "Queue role not found");
  await db.queueRole.update({ where: { id: params.id }, data: body });
  await audit(actor.id, "queue.role.update", "QueueRole", params.id, { from: { priority: before.priority, reservedSlot: before.reservedSlot }, to: { priority: body.priority, reservedSlot: body.reservedSlot }, label: body.label });
  revalidateQueueRoles();
  return NextResponse.json({ ok: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const actor = await requireStaff("queue.manage");
  const role = await db.queueRole.findUnique({ where: { id: params.id } });
  if (!role) throw new ApiError(404, "Queue role not found");
  await db.queueRole.delete({ where: { id: params.id } });
  await audit(actor.id, "queue.role.delete", "QueueRole", params.id, { label: role.label });
  revalidateQueueRoles();
  return NextResponse.json({ ok: true });
});
