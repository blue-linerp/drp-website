import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { ApiError, clientIp, parseBody, route } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ helpful: z.boolean() });

/** One vote per visitor per guide (signed-in user, else an anonymous cookie); changing your vote moves the count. */
export const POST = route<{ params: { slug: string } }>(async (req, { params }) => {
  await rateLimit("guide-vote", clientIp(req), 30, "1 h");
  const { helpful } = await parseBody(req, schema);
  const guide = await db.guide.findFirst({ where: { slug: params.slug, published: true }, select: { id: true } });
  if (!guide) throw new ApiError(404, "Guide not found");

  const session = await auth();
  const jar = cookies();
  let voterId = session?.user?.id ? `u:${session.user.id}` : jar.get("drp_vid")?.value;
  const setCookie = !voterId;
  if (!voterId) voterId = `a:${crypto.randomUUID()}`;

  await db.$transaction(async (tx) => {
    const prev = await tx.guideVote.findUnique({ where: { guideId_voterId: { guideId: guide.id, voterId: voterId! } } });
    if (prev?.helpful === helpful) return;
    await tx.guideVote.upsert({
      where: { guideId_voterId: { guideId: guide.id, voterId: voterId! } },
      create: { guideId: guide.id, voterId: voterId!, userId: session?.user?.id ?? null, helpful },
      update: { helpful },
    });
    await tx.guide.update({
      where: { id: guide.id },
      data: {
        helpfulYes: { increment: (helpful ? 1 : 0) - (prev?.helpful === true ? 1 : 0) },
        helpfulNo: { increment: (!helpful ? 1 : 0) - (prev?.helpful === false ? 1 : 0) },
      },
    });
  });

  const res = NextResponse.json({ ok: true });
  if (setCookie) res.cookies.set("drp_vid", voterId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
});
