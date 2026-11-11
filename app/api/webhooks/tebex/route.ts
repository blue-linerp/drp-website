import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, route } from "@/lib/api";
import { audit } from "@/lib/audit";
import { interpretTebex, tebexCustomer, verifyTebexSignature, type TebexWebhook } from "@/lib/tebex";
import { syncMember } from "@/lib/sync";
import { COLORS, postWebhook } from "@/lib/discord";

export const dynamic = "force-dynamic";

/**
 * Tebex → supporter tier. Matches the buyer by the store login (Discord ID or Cfx.re ID),
 * then email. Sets/clears the tier + expiry and syncs the Discord tier roles.
 */
export const POST = route(async (req) => {
  const raw = await req.text();
  if (!verifyTebexSignature(raw, req.headers.get("x-signature"), env.tebexWebhookSecret)) throw new ApiError(401, "Invalid signature");
  let evt: TebexWebhook;
  try {
    evt = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }

  // Tebex sends this once when the endpoint is added; it must echo the id.
  if (evt.type === "validation.webhook") return NextResponse.json({ id: evt.id });

  const outcome = interpretTebex(evt);
  if (outcome.kind === "ignore") return NextResponse.json({ ok: true, ignored: evt.type });

  const tiers = await db.supporterTier.findMany({ where: { tebexPackageId: { in: outcome.packageIds } }, orderBy: { priority: "desc" } });
  if (!tiers.length) return NextResponse.json({ ok: true, ignored: "no matching supporter package" });
  const tier = tiers[0];

  const c = tebexCustomer(evt);
  const user =
    (c.id && /^\d{17,20}$/.test(c.id) ? await db.user.findUnique({ where: { discordId: c.id } }) : null) ??
    (c.id ? await db.user.findUnique({ where: { fivemId: `fivem:${c.id}` } }) : null) ??
    (c.email ? await db.user.findFirst({ where: { email: c.email } }) : null);

  if (!user) {
    await audit(null, "tebex.unmatched", "Tebex", evt.id, { type: evt.type, customer: c, tier: tier.name });
    await postWebhook(env.logWebhookUrl, {
      embeds: [{ title: "Tebex purchase couldn't be matched to a player", color: COLORS.amber, description: `${evt.type} · ${tier.name} · ${c.username ?? c.id ?? "unknown"}. Link it manually in the admin panel.` }],
    });
    // 200 so Tebex doesn't retry forever; staff are notified.
    return NextResponse.json({ ok: true, matched: false });
  }

  if (outcome.kind === "grant") {
    await db.user.update({ where: { id: user.id }, data: { supporterTierId: tier.id, supporterUntil: outcome.until, tebexTransaction: evt.subject.transaction_id ?? evt.subject.last_payment?.transaction_id ?? null } });
  } else if (user.supporterTierId === tier.id) {
    await db.user.update({ where: { id: user.id }, data: { supporterTierId: null, supporterUntil: null } });
  }
  await audit(null, `tebex.${outcome.kind}`, "User", user.id, { type: evt.type, tier: tier.name, until: outcome.kind === "grant" ? outcome.until : null });

  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (fresh) await syncMember(fresh);
  return NextResponse.json({ ok: true, matched: true });
});
