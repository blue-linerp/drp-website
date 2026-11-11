import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, route } from "@/lib/api";
import { normId, verifyFivemRequest } from "@/lib/fivem-auth";

export const dynamic = "force-dynamic";

const str = (max: number) => z.string().max(max).nullish().transform((v) => (v ? v : null));
const money = z.coerce.number().finite().transform((n) => Math.max(-2147483648, Math.min(2147483647, Math.round(n))));

const character = z.object({
  citizenid: z.string().min(1).max(40),
  firstname: z.string().max(60).default(""),
  lastname: z.string().max(60).default(""),
  birthdate: str(40),
  gender: str(20),
  nationality: str(60),
  phone: str(30),
  jobName: str(60),
  jobLabel: str(80),
  jobGrade: str(80),
  onDuty: z.boolean().default(false),
  gangName: str(60),
  gangLabel: str(80),
  gangGrade: str(80),
  cash: money.default(0),
  bank: money.default(0),
  /** players.last_updated, as epoch seconds or an ISO string */
  lastUpdated: z.union([z.number(), z.string()]).nullish(),
});

const schema = z.object({
  license: z.string().min(5).max(80),
  characters: z.array(character).max(20),
});

function toDate(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The gate resource reports a player's Qbox/QBCore characters (from the `players` table).
 * Characters are upserted by citizenid; ones no longer in the game (deleted) are removed.
 * Playtime and last-played are tracked separately from heartbeats and are never overwritten here.
 */
export const POST = route(async (req) => {
  verifyFivemRequest(req);
  const body = await parseBody(req, schema);
  const license = normId("license", body.license)!;
  const user = await db.user.findUnique({ where: { fivemLicense: license }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: true, updated: 0, note: "No website account linked to this licence yet" });

  const ids = body.characters.map((c) => c.citizenid);
  await db.$transaction([
    ...body.characters.map(({ lastUpdated, ...c }) => {
      const data = { ...c, firstname: c.firstname || "Unknown", lastname: c.lastname || "", gameUpdatedAt: toDate(lastUpdated), userId: user.id };
      return db.character.upsert({ where: { citizenid: c.citizenid }, create: data, update: data });
    }),
    db.character.deleteMany({ where: { userId: user.id, citizenid: { notIn: ids } } }),
  ]);
  return NextResponse.json({ ok: true, updated: ids.length });
});
