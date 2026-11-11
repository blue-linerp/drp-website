import "server-only";
import { env } from "./env";
import { db } from "./db";

export const GTA_V_GAME_ID = "32982";

export interface LiveStream {
  creatorId: string;
  creatorName: string;
  userLogin: string;
  title: string;
  viewers: number;
  thumbnail: string;
  avatar: string | null;
  startedAt: string;
  url: string;
}

let appToken: { token: string; exp: number } | null = null;
let liveCache: { at: number; value: LiveStream[] } | null = null;

export function twitchConfigured() {
  return Boolean(env.twitchClientId && env.twitchClientSecret);
}

async function token() {
  if (appToken && appToken.exp > Date.now() + 60_000) return appToken.token;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.twitchClientId,
      client_secret: env.twitchClientSecret,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return appToken.token;
}

async function helix<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { "Client-Id": env.twitchClientId, Authorization: `Bearer ${await token()}` },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (res.status === 401) appToken = null;
  if (!res.ok) throw new Error(`Twitch ${path.split("?")[0]} ${res.status}`);
  return (await res.json()) as T;
}

export function matchesServer(title: string, gameId: string, tags = env.twitchServerTags) {
  if (gameId !== GTA_V_GAME_ID) return false;
  const t = title.toLowerCase();
  return tags.some((tag) => t.includes(tag.toLowerCase()));
}

/** Resolve twitch logins → numeric ids for creators that only have a login saved. */
async function backfillIds() {
  const missing = await db.creator.findMany({ where: { approved: true, twitchId: null, twitchLogin: { not: null } } });
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const q = batch.map((c) => `login=${encodeURIComponent(c.twitchLogin!.toLowerCase())}`).join("&");
    const { data } = await helix<{ data: { id: string; login: string; profile_image_url: string }[] }>(`users?${q}`);
    for (const u of data) {
      const c = batch.find((x) => x.twitchLogin!.toLowerCase() === u.login);
      if (c) await db.creator.update({ where: { id: c.id }, data: { twitchId: u.id, avatar: c.avatar ?? u.profile_image_url } });
    }
  }
}

/** Live creators streaming GTA V with a server tag in the title. Cached 60s. */
export async function getLiveStreams(): Promise<LiveStream[]> {
  if (liveCache && Date.now() - liveCache.at < 60_000) return liveCache.value;
  if (!twitchConfigured()) return [];
  try {
    await backfillIds();
    const creators = await db.creator.findMany({ where: { approved: true, twitchId: { not: null } } });
    const out: LiveStream[] = [];
    for (let i = 0; i < creators.length; i += 100) {
      const batch = creators.slice(i, i + 100);
      const q = batch.map((c) => `user_id=${c.twitchId}`).join("&");
      const { data } = await helix<{
        data: { user_id: string; user_login: string; game_id: string; title: string; viewer_count: number; thumbnail_url: string; started_at: string }[];
      }>(`streams?first=100&${q}`);
      for (const s of data) {
        if (!matchesServer(s.title, s.game_id)) continue;
        const c = batch.find((x) => x.twitchId === s.user_id)!;
        out.push({
          creatorId: c.id,
          creatorName: c.name,
          userLogin: s.user_login,
          title: s.title,
          viewers: s.viewer_count,
          thumbnail: s.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
          avatar: c.avatar,
          startedAt: s.started_at,
          url: `https://twitch.tv/${s.user_login}`,
        });
      }
    }
    out.sort((a, b) => b.viewers - a.viewers);
    liveCache = { at: Date.now(), value: out };
    return out;
  } catch (e) {
    console.warn("[twitch]", (e as Error).message);
    return liveCache?.value ?? [];
  }
}
