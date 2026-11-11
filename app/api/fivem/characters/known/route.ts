import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { normId, verifyFivemRequest } from "@/lib/fivem-auth";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  verifyFivemRequest(req);
  const { license: raw } = await parseBody(req, z.object({ license: z.string().min(5).max(80) }));
  const user = await db.user.findUnique({ where: { fivemLicense: normId("license", raw)! }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: false, error: "No website account linked to this licence" }, { status: 404 });
  const characters = await db.character.findMany({ where: { userId: user.id }, select: { citizenid: true } });
  return NextResponse.json({ ok: true, characters: characters.map((c) => c.citizenid) });
});
