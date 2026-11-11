import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { staffUpdate } from "@/lib/applications";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("status"),
    to: z.enum(["PENDING", "UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "DENIED"]),
    reason: z.string().trim().max(2000).optional(),
    interviewAt: z.string().datetime({ offset: true }).optional(),
  }),
  z.object({ kind: z.literal("note"), text: z.string().trim().min(1).max(4000) }),
  z.object({ kind: z.literal("assign"), toMe: z.boolean() }),
]);

export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const actor = await requireStaff("apps.review");
  const app = await db.application.findUnique({ where: { id: params.id }, select: { type: { select: { department: true } } } });
  if (!app) throw new ApiError(404, "Application not found");
  // DEPT_HEAD can only act on their own department's applications.
  if (!can(actor.access, "apps.review", { department: app.type.department })) throw new ApiError(403, "That application is outside your department.");
  const body = await parseBody(req, schema);
  await staffUpdate(params.id, actor, body);
  return NextResponse.json({ ok: true });
});
