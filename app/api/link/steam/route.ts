import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { route } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { steamLoginUrl } from "@/lib/linking";
import { LINK_COOKIE, cookieOptions, seal } from "@/lib/link-state";

export const dynamic = "force-dynamic";

/** Start: send the signed-in user to Steam's OpenID sign-in. */
export const GET = route(async () => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/signin?callbackUrl=/profile", site.url));
  await rateLimit("link-steam", session.user.id, 10, "10 m");
  const state = crypto.randomUUID();
  const returnTo = `${site.url}/api/link/steam/callback?state=${state}`;
  const res = NextResponse.redirect(steamLoginUrl(returnTo));
  res.cookies.set(LINK_COOKIE.steam, seal({ state, uid: session.user.id }, 600), cookieOptions(600));
  return res;
});

/** Unlink Steam from the signed-in account. */
export const DELETE = route(async () => {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { steamHex: null, steamName: null } });
  await audit(user.id, "unlink.steam", "User", user.id, { steamHex: user.steamHex });
  return NextResponse.json({ ok: true });
});
