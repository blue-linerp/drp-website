import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { db } from "./lib/db";
import { snowflakeToDate } from "./lib/utils";
import { botConfigured, getGuildMember, getOwnGuildMember, type GuildMember } from "./lib/discord";
import { syncMember } from "./lib/sync";

declare module "next-auth" {
  interface Session {
    user: { id: string; discordId: string } & DefaultSession["user"];
  }
}

interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
}

async function upsertFromDiscord(profile: DiscordProfile, member: GuildMember | null | undefined) {
  const user = await db.user.upsert({
    where: { discordId: profile.id },
    create: {
      discordId: profile.id,
      username: profile.username,
      globalName: profile.global_name ?? null,
      avatar: profile.avatar ?? null,
      email: profile.email ?? null,
      discordCreatedAt: snowflakeToDate(profile.id),
    },
    update: { username: profile.username, globalName: profile.global_name ?? null, avatar: profile.avatar ?? null },
  });
  return syncMember(user, member);
}

/**
 * Test-only sign-in for the Playwright suite. It is registered only when
 * AUTH_TEST_LOGIN_SECRET is set (never set it in production) and requires that secret.
 */
const testProvider = process.env.AUTH_TEST_LOGIN_SECRET
  ? [
      Credentials({
        id: "test-login",
        name: "Test login",
        credentials: { discordId: {}, username: {}, secret: {}, roles: {} },
        async authorize(c) {
          if (!c || c.secret !== process.env.AUTH_TEST_LOGIN_SECRET) return null;
          const discordId = String(c.discordId);
          if (!/^\d{17,20}$/.test(discordId)) return null;
          const member: GuildMember = {
            roles: String(c.roles || "").split(",").filter(Boolean),
            joined_at: new Date(Date.now() - 90 * 86_400_000).toISOString(),
          };
          const user = await upsertFromDiscord({ id: discordId, username: String(c.username || "tester") }, member);
          return { id: user.id, name: user.username, discordId: user.discordId } as never;
        },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, ...testProvider],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "discord" && profile) {
        const p = profile as unknown as DiscordProfile;
        let member: GuildMember | null | undefined;
        try {
          // Bot read is authoritative; the user's token (guilds.members.read) works without a bot.
          member = botConfigured() ? await getGuildMember(p.id) : account.access_token ? await getOwnGuildMember(account.access_token) : undefined;
        } catch (e) {
          console.warn("[auth] guild member lookup failed", (e as Error).message);
          member = undefined;
        }
        const dbUser = await upsertFromDiscord(p, member);
        token.uid = dbUser.id;
        token.discordId = dbUser.discordId;
        token.picture = null;
        // The OAuth access token is used only above and is not persisted.
      } else if (account?.provider === "test-login" && user) {
        token.uid = user.id;
        token.discordId = (user as { discordId?: string }).discordId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.discordId = token.discordId as string;
      return session;
    },
  },
});
