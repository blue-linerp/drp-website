import type { Creator } from "@prisma/client";
import { cn } from "@/lib/utils";

export function creatorLinks(c: Pick<Creator, "twitchLogin" | "youtubeChannelId" | "tiktok" | "kick">) {
  return [
    c.twitchLogin && { label: "Twitch", href: `https://twitch.tv/${c.twitchLogin}`, color: "#9146FF" },
    c.youtubeChannelId && { label: "YouTube", href: `https://youtube.com/channel/${c.youtubeChannelId}`, color: "#FF0033" },
    c.tiktok && { label: "TikTok", href: `https://tiktok.com/@${c.tiktok.replace(/^@/, "")}`, color: "#25F4EE" },
    c.kick && { label: "Kick", href: `https://kick.com/${c.kick}`, color: "#53FC18" },
  ].filter(Boolean) as { label: string; href: string; color: string }[];
}

export function CreatorLinks({ creator, className }: { creator: Pick<Creator, "twitchLogin" | "youtubeChannelId" | "tiktok" | "kick" | "name">; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {creatorLinks(creator).map((l) => (
        <li key={l.label}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${creator.name} on ${l.label}`}
            className="chamfer chamfer-sm inline-flex items-center gap-2 bg-white/[0.06] px-3 py-1.5 font-digits text-[11px] font-bold uppercase tracking-[0.15em] text-white/80 ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-white"
          >
            <span className="hex h-2 w-2" style={{ background: l.color }} aria-hidden />
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
