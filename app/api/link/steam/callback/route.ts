import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { site } from "@/lib/site";
import { linkSteam, profileRedirect, verifySteamAssertion } from "@/lib/linking";
import { LINK_COOKIE, unseal } from "@/lib/link-state";

export const dynamic = "force-dynamic";

/** Steam returns here. The assertion is verified with Steam and bound to the session that started it. */
export async function GET(req: NextRequest) {
  const fail = (code: string) => {
    const res = NextResponse.redirect(profileRedirect(`link_error=${code}&provider=steam`));
    res.cookies.delete({ name: LINK_COOKIE.steam, path: "/api/link" });
    return res;
  };
  try {
    const session = await auth();
    const pending = unseal<{ state: string; uid: string }>(cookies().get(LINK_COOKIE.steam)?.value);
    const params = req.nextUrl.searchParams;
    if (!session?.user?.id || !pending || pending.uid !== session.user.id || params.get("state") !== pending.state) return fail("expired");
    if (params.get("openid.mode") === "cancel") return fail("cancelled");

    const id64 = await verifySteamAssertion(params, `${site.url}/api/link/steam/callback`);
    if (!id64) return fail("invalid");
    const result = await linkSteam(session.user.id, id64);
    if (!result.ok) return fail(result.error);

    const res = NextResponse.redirect(profileRedirect("linked=steam"));
    res.cookies.delete({ name: LINK_COOKIE.steam, path: "/api/link" });
    return res;
  } catch (e) {
    console.error("[link/steam]", e);
    return fail("failed");
  }
}
