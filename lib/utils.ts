import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Discord snowflake → creation date. */
export function snowflakeToDate(id: string): Date {
  const DISCORD_EPOCH = 1420070400000n;
  return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
}

export function discordAvatarUrl(discordId: string, avatar?: string | null, size = 128) {
  if (avatar) {
    const ext = avatar.startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=${size}`;
  }
  const idx = Number((BigInt(discordId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d) : d;
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Human-friendly reference like DRP-7K3Q9X */
export function makeReference(prefix = "DRP") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out}`;
}
