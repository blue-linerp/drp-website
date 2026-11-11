import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getState, setState } from "@/lib/settings";
import type { QueueCommands } from "@/lib/fivem";

const schema = z.object({ action: z.literal("kick"), license: z.string().min(5).max(80), reason: z.string().trim().max(200).default("Removed from the queue by staff.") });

/** Queue commands are delivered to the FiveM resource in the next heartbeat response (≤30s). */
export const POST = route(async (req) => {
  const actor = await requireStaff("queue.manage");
  const body = await parseBody(req, schema);
  const cmds = await getState<QueueCommands>("queue.commands", { kicks: [] });
  cmds.kicks = [...cmds.kicks.filter((k) => Date.now() - k.at < 10 * 60_000 && k.license !== body.license), { license: body.license, reason: body.reason, at: Date.now() }];
  await setState("queue.commands", cmds);
  await audit(actor.id, "queue.kick", "Queue", body.license, { reason: body.reason });
  return NextResponse.json({ ok: true });
});
