import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { submitApplication } from "@/lib/applications";
import { answersSchema } from "@/lib/questions";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const applications = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      reference: true,
      typeId: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      type: { select: { title: true, slug: true } },
    },
  });
  return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
});

const submitSchema = z.object({ typeSlug: z.string().min(1).max(80), answers: answersSchema });

export const POST = route(async (req) => {
  const user = await requireUser();
  await rateLimit("app-submit", user.id, 5, "1 h");
  const body = await parseBody(req, submitSchema);
  const app = await submitApplication(user, body.typeSlug, body.answers);
  return NextResponse.json({ id: app.id, reference: app.reference }, { status: 201 });
});
