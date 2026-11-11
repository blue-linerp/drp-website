import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { CONTENT_KINDS, delegate, revalidateKind, type ContentKind } from "@/lib/admin-content";

const schema = z.object({ ids: z.array(z.string().min(1)).max(500) });

/** Drag-and-drop reorder: persists the given id order as 0..n. */
export const POST = route<{ params: { kind: string } }>(async (req, { params }) => {
  const actor = await requireStaff("content.manage");
  if (!CONTENT_KINDS.includes(params.kind as ContentKind)) throw new ApiError(404, "Unknown content type");
  const kind = params.kind as ContentKind;
  const { ids } = await parseBody(req, schema);
  const d = delegate(kind);
  await db.$transaction(ids.map((id, order) => d.update({ where: { id }, data: { order } }) as never));
  await audit(actor.id, `content.${kind}.reorder`, kind, null, { count: ids.length });
  revalidateContent(revalidateKind[kind]);
  return NextResponse.json({ ok: true });
});
