import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { typeSchema, toData } from "@/lib/admin-types";

type Ctx = { params: { id: string } };

export const PUT = route<Ctx>(async (req, { params }) => {
  const actor = await requireStaff("types.manage");
  const body = await parseBody(req, typeSchema);
  const clash = await db.applicationType.findUnique({ where: { slug: body.slug } });
  if (clash && clash.id !== params.id) throw new ApiError(409, "That slug is already used.");
  await db.applicationType.update({ where: { id: params.id }, data: toData(body) });
  await audit(actor.id, "type.update", "ApplicationType", params.id, { slug: body.slug, isOpen: body.isOpen });
  revalidateContent("types");
  return NextResponse.json({ ok: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const actor = await requireStaff("types.manage");
  const count = await db.application.count({ where: { typeId: params.id } });
  if (count) throw new ApiError(409, `This type has ${count} application(s). Close it instead of deleting so history is kept.`);
  await db.applicationType.delete({ where: { id: params.id } });
  await audit(actor.id, "type.delete", "ApplicationType", params.id, {});
  revalidateContent("types");
  return NextResponse.json({ ok: true });
});
