import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { queueRoleSchema } from "@/lib/admin-queue";
import { revalidateQueueRoles } from "@/lib/queue-roles";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireStaff("queue.manage");
  return NextResponse.json({ roles: await db.queueRole.findMany({ orderBy: [{ priority: "desc" }, { order: "asc" }] }) });
});

export const POST = route(async (req) => {
  const actor = await requireStaff("queue.manage");
  const body = await parseBody(req, queueRoleSchema);
  if (await db.queueRole.findUnique({ where: { discordRoleId: body.discordRoleId } })) throw new ApiError(409, "That Discord role already has a queue priority.");
  const role = await db.queueRole.create({ data: body });
  await audit(actor.id, "queue.role.create", "QueueRole", role.id, { label: role.label, priority: role.priority, reservedSlot: role.reservedSlot });
  revalidateQueueRoles();
  return NextResponse.json({ id: role.id }, { status: 201 });
});
