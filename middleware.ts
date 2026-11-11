import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Edge gate: /admin and /profile require a session. Fine-grained role checks
// happen server-side in each admin page/route (lib/session.ts).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
