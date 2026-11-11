import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { verifyFivemRequest } from "@/lib/fivem-auth";

export const dynamic = "force-dynamic";

// Only the authenticated game server may report a confirmed framework deletion.
export const POST = route(async (req) => {
  verifyFivemRequest(req);
  const { citizenid } = await parseBody(req, z.object({ citizenid: z.string().min(1).max(40) }));
  const result = await db.character.deleteMany({ where: { citizenid } });
  return NextResponse.json({ ok: true, deleted: result.count });
});
