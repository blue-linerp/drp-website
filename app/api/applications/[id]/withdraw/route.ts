import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { withdraw } from "@/lib/applications";

export const POST = route<{ params: { id: string } }>(async (_req, { params }) => {
  const user = await requireUser();
  await withdraw(params.id, user);
  return NextResponse.json({ ok: true });
});
