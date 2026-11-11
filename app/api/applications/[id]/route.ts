import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, route } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const GET = route<{ params: { id: string } }>(async (_req, { params }) => {
  const user = await requireUser();
  const app = await db.application.findUnique({
    where: { id: params.id },
    include: { type: { select: { title: true, slug: true, questions: true, department: true } } },
  });
  if (!app) throw new ApiError(404, "Application not found");
  const isOwner = app.userId === user.id;
  if (!isOwner && !can(user.access, "apps.review", { department: app.type.department })) throw new ApiError(404, "Application not found");
  // Applicants (including staff viewing their own) never see internal notes or the reviewer trail.
  const { internalNotes, history, ...rest } = app;
  return NextResponse.json({ application: isOwner ? rest : app });
});
