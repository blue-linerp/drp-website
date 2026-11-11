import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { route } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { newCfxRequest } from "@/lib/linking";
import { LINK_COOKIE, cookieOptions, seal } from "@/lib/link-state";

export const dynamic = "force-dynamic";

/** Start: ask the Cfx.re forum for a short-lived user API key (scope: session_info). */
export const GET = route(async () => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/signin?callbackUrl=/profile", site.url));
  await rateLimit("link-cfx", session.user.id, 10, "10 m");
  const req = newCfxRequest(`${site.url}/api/link/cfx/callback`);
  const res = NextResponse.redirect(req.url);
  // The RSA private key never leaves the server unencrypted; it rides in a sealed cookie for 10 min.
  res.cookies.set(LINK_COOKIE.cfx, seal({ uid: session.user.id, pk: req.privateKey, nonce: req.nonce, cid: req.clientId }, 600), cookieOptions(600));
  return res;
});

/** Unlink Cfx.re from the signed-in account. */
export const DELETE = route(async () => {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { fivemId: null, cfxName: null } });
  await audit(user.id, "unlink.cfx", "User", user.id, { fivemId: user.fivemId });
  return NextResponse.json({ ok: true });
});
