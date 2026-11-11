import { NextResponse } from "next/server";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { CONTENT_KINDS, contentSchemas, delegate, prepare, revalidateKind, type ContentKind } from "@/lib/admin-content";

type Ctx = { params: { kind: string } };

function kindOf(k: string): ContentKind {
  if (!CONTENT_KINDS.includes(k as ContentKind)) throw new ApiError(404, "Unknown content type");
  return k as ContentKind;
}

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireStaff("content.manage");
  const kind = kindOf(params.kind);
  return NextResponse.json({ items: await delegate(kind).findMany({ orderBy: { order: "asc" } }) });
});

export const POST = route<Ctx>(async (req, { params }) => {
  const actor = await requireStaff("content.manage");
  const kind = kindOf(params.kind);
  const body = await parseBody(req, contentSchemas[kind]);
  const d = delegate(kind);
  const max = await d.aggregate({ _max: { order: true } });
  try {
    const item = await d.create({ data: { ...prepare(kind, body as Record<string, unknown>), order: (max._max.order ?? -1) + 1 } });
    await audit(actor.id, `content.${kind}.create`, kind, item.id, {});
    revalidateContent(revalidateKind[kind]);
    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new ApiError(409, "Something with that name or slug already exists.");
    throw e;
  }
});
