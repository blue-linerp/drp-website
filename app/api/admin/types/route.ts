import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { typeSchema, toData } from "@/lib/admin-types";


export const POST = route(async (req) => {
  const actor = await requireStaff("types.manage");
  const body = await parseBody(req, typeSchema);
  if (await db.applicationType.findUnique({ where: { slug: body.slug } })) throw new ApiError(409, "That slug is already used.");
  const max = await db.applicationType.aggregate({ _max: { order: true } });
  const type = await db.applicationType.create({ data: { ...toData(body), order: (max._max.order ?? 0) + 1 } });
  await audit(actor.id, "type.create", "ApplicationType", type.id, { slug: type.slug });
  revalidateContent("types");
  return NextResponse.json({ id: type.id }, { status: 201 });
});
