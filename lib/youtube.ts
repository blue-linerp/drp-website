import "server-only";
import { env } from "./env";

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

const cache = new Map<string, { at: number; value: Video[] }>();
const TTL = 60 * 60 * 1000;

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Latest uploads for a channel. Uses the Data API when YOUTUBE_API_KEY is set, else the public RSS feed. */
export async function latestVideos(channelId: string, max = 3): Promise<Video[]> {
  const hit = cache.get(channelId);
  if (hit && Date.now() - hit.at < TTL) return hit.value.slice(0, max);
  let videos: Video[] = [];
  try {
    if (env.youtubeApiKey && channelId.startsWith("UC")) {
      const playlist = "UU" + channelId.slice(2);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=6&playlistId=${playlist}&key=${env.youtubeApiKey}`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error(`YouTube API ${res.status}`);
      const j = (await res.json()) as {
        items: { snippet: { title: string; publishedAt: string; channelTitle: string; resourceId: { videoId: string } } }[];
      };
      videos = j.items.map((i) => ({
        id: i.snippet.resourceId.videoId,
        title: i.snippet.title,
        publishedAt: i.snippet.publishedAt,
        channelTitle: i.snippet.channelTitle,
        thumbnail: `https://i.ytimg.com/vi/${i.snippet.resourceId.videoId}/hqdefault.jpg`,
      }));
    } else {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
      const xml = await res.text();
      const channelTitle = decode(xml.match(/<author>\s*<name>([^<]+)<\/name>/)?.[1] ?? "");
      videos = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map(([, e]) => {
        const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
        return {
          id,
          title: decode(e.match(/<title>([^<]+)<\/title>/)?.[1] ?? ""),
          publishedAt: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
          channelTitle,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      });
    }
    cache.set(channelId, { at: Date.now(), value: videos });
  } catch (e) {
    console.warn("[youtube]", channelId, (e as Error).message);
    videos = hit?.value ?? [];
  }
  return videos.slice(0, max);
}

/** Title + channel for a single video via oEmbed (no API key). */
export async function videoInfo(id: string): Promise<Video> {
  const fallback: Video = { id, title: "Watch on YouTube", channelTitle: "", publishedAt: "", thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;
    const j = (await res.json()) as { title: string; author_name: string };
    return { ...fallback, title: j.title, channelTitle: j.author_name };
  } catch {
    return fallback;
  }
}
