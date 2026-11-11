import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { answersSchema, cleanAnswers, parseQuestions } from "@/lib/questions";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: { typeSlug: string } };

async function typeFor(slug: string) {
  const type = await db.applicationType.findUnique({ where: { slug } });
  if (!type) throw new ApiError(404, "Application not found");
  return type;
}

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const type = await typeFor(params.typeSlug);
  const draft = await db.applicationDraft.findUnique({ where: { userId_typeId: { userId: user.id, typeId: type.id } } });
  return NextResponse.json({ draft });
});

const schema = z.object({ answers: answersSchema, step: z.number().int().min(0).max(100) });

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  await rateLimit("draft", user.id, 60, "1 m");
  const type = await typeFor(params.typeSlug);
  const body = await parseBody(req, schema);
  const answers = cleanAnswers(parseQuestions(type.questions), body.answers) as Prisma.InputJsonValue;
  const draft = await db.applicationDraft.upsert({
    where: { userId_typeId: { userId: user.id, typeId: type.id } },
    create: { userId: user.id, typeId: type.id, answers, step: body.step },
    update: { answers, step: body.step },
  });
  return NextResponse.json({ savedAt: draft.updatedAt });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const type = await typeFor(params.typeSlug);
  await db.applicationDraft.deleteMany({ where: { userId: user.id, typeId: type.id } });
  return NextResponse.json({ ok: true });
});
