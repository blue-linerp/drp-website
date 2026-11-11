import { NextResponse } from "next/server";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { CONTENT_KINDS, contentSchemas, delegate, prepare, revalidateKind, type ContentKind } from "@/lib/admin-content";

type Ctx = { params: { kind: string; id: string } };

function kindOf(k: string): ContentKind {
  if (!CONTENT_KINDS.includes(k as ContentKind)) throw new ApiError(404, "Unknown content type");
  return k as ContentKind;
}

export const PUT = route<Ctx>(async (req, { params }) => {
  const actor = await requireStaff("content.manage");
  const kind = kindOf(params.kind);
  const body = await parseBody(req, contentSchemas[kind]);
  try {
    await delegate(kind).update({ where: { id: params.id }, data: prepare(kind, body as Record<string, unknown>) });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") throw new ApiError(409, "Something with that name or slug already exists.");
    if (code === "P2025") throw new ApiError(404, "Not found");
    throw e;
  }
  await audit(actor.id, `content.${kind}.update`, kind, params.id, {});
  revalidateContent(revalidateKind[kind]);
  return NextResponse.json({ ok: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const actor = await requireStaff("content.manage");
  const kind = kindOf(params.kind);
  await delegate(kind).delete({ where: { id: params.id } });
  await audit(actor.id, `content.${kind}.delete`, kind, params.id, {});
  revalidateContent(revalidateKind[kind]);
  return NextResponse.json({ ok: true });
});
