import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

/**
 * Edge-safe part of the Auth.js config (no Prisma). Used by middleware.
 * The DB-backed callbacks live in auth.ts.
 */
export default {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // Discord now returns `iss=https://discord.com` on the callback (RFC 9207). Without a
      // matching issuer Auth.js compares it to its "https://authjs.dev" placeholder and fails.
      issuer: "https://discord.com",
      // The provider's default is a bare URL string; overriding with an object must
      // include `url`, or Auth.js fails with "Invalid URL" before redirecting to Discord.
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: { scope: "identify guilds guilds.members.read", prompt: "none" },
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const p = request.nextUrl.pathname;
      if (p.startsWith("/admin") || p.startsWith("/profile")) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
