import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { cfxCurrentUser, decryptCfxPayload, linkCfx, profileRedirect } from "@/lib/linking";
import { LINK_COOKIE, unseal } from "@/lib/link-state";

export const dynamic = "force-dynamic";

/** Cfx.re forum returns here with an RSA-encrypted payload holding the user API key. */
export async function GET(req: NextRequest) {
  const fail = (code: string) => {
    const res = NextResponse.redirect(profileRedirect(`link_error=${code}&provider=cfx`));
    res.cookies.delete({ name: LINK_COOKIE.cfx, path: "/api/link" });
    return res;
  };
  try {
    const session = await auth();
    const pending = unseal<{ uid: string; pk: string; nonce: string; cid: string }>(cookies().get(LINK_COOKIE.cfx)?.value);
    if (!session?.user?.id || !pending || pending.uid !== session.user.id) return fail("expired");
    const payload = req.nextUrl.searchParams.get("payload");
    if (!payload) return fail("cancelled");

    const data = decryptCfxPayload(payload, pending.pk);
    if (!data || data.nonce !== pending.nonce) return fail("invalid");
    const user = await cfxCurrentUser(data.key, pending.cid);
    if (!user) return fail("invalid");
    const result = await linkCfx(session.user.id, user.id, user.username);
    if (!result.ok) return fail(result.error);

    const res = NextResponse.redirect(profileRedirect("linked=cfx"));
    res.cookies.delete({ name: LINK_COOKIE.cfx, path: "/api/link" });
    return res;
  } catch (e) {
    console.error("[link/cfx]", e);
    return fail("failed");
  }
}
