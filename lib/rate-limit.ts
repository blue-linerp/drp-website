import "server-only";
import { LRUCache } from "lru-cache";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import { ApiError } from "./api";

type Window = `${number} ${"s" | "m" | "h"}`;

const memory = new LRUCache<string, number[]>({ max: 20_000, ttl: 60 * 60 * 1000 });
const upstash = new Map<string, Ratelimit>();

function windowMs(w: Window) {
  const [n, unit] = w.split(" ");
  return Number(n) * (unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000);
}

/**
 * Sliding-window limit. Uses Upstash Redis when configured (shared across serverless
 * instances), otherwise an in-process LRU (fine for a single VPS/Docker instance).
 */
export async function rateLimit(bucket: string, id: string, limit: number, window: Window) {
  const key = `${bucket}:${id}`;
  if (env.upstashUrl && env.upstashToken) {
    let rl = upstash.get(`${bucket}:${limit}:${window}`);
    if (!rl) {
      rl = new Ratelimit({
        redis: new Redis({ url: env.upstashUrl, token: env.upstashToken }),
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: "drp-rl",
      });
      upstash.set(`${bucket}:${limit}:${window}`, rl);
    }
    const r = await rl.limit(key);
    if (!r.success) throw new ApiError(429, "Too many requests. Please slow down.", { retryAt: r.reset });
    return;
  }
  const now = Date.now();
  const ms = windowMs(window);
  const hits = (memory.get(key) ?? []).filter((t) => now - t < ms);
  if (hits.length >= limit) throw new ApiError(429, "Too many requests. Please slow down.", { retryAt: hits[0] + ms });
  hits.push(now);
  memory.set(key, hits);
}
