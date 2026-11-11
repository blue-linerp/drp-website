import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { getGuildRoles } from "@/lib/discord";

export const dynamic = "force-dynamic";

/** Discord server roles for staff pickers (queue roles). */
export const GET = route(async () => {
  await requireStaff("queue.manage");
  const roles = await getGuildRoles().catch(() => []);
  return NextResponse.json({
    roles: roles.filter((r) => !r.managed).map((r) => ({ id: r.id, name: r.name, color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : null })),
  });
});
