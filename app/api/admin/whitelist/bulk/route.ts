import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { setWhitelist } from "@/lib/whitelist";
import { findOrCreateByDiscordId } from "@/lib/users";
import { audit } from "@/lib/audit";

const schema = z.object({
  /** Discord IDs separated by commas, spaces or new lines (e.g. pasted from a spreadsheet). */
  ids: z.string().max(50_000),
  reason: z.string().trim().min(1).max(200),
});

export const POST = route(async (req) => {
  const actor = await requireStaff("whitelist.manage");
  const body = await parseBody(req, schema);
  const ids = Array.from(new Set(body.ids.match(/\d{17,20}/g) ?? [])).slice(0, 500);
  const results: { discordId: string; ok: boolean; error?: string }[] = [];
  for (const discordId of ids) {
    try {
      const user = await findOrCreateByDiscordId(discordId);
      if (!user.whitelisted) await setWhitelist(user.id, true, actor.id, body.reason);
      results.push({ discordId, ok: true });
    } catch (e) {
      results.push({ discordId, ok: false, error: (e as Error).message });
    }
  }
  await audit(actor.id, "whitelist.bulk", "User", null, { count: ids.length, failed: results.filter((r) => !r.ok).length });
  return NextResponse.json({ total: ids.length, ok: results.filter((r) => r.ok).length, results });
});
