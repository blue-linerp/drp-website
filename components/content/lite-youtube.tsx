"use client";
import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/** Click-to-play YouTube: only a thumbnail loads until the viewer asks for the player. */
export function LiteYouTube({ id, title, channel }: { id: string; title: string; channel?: string }) {
  const [play, setPlay] = useState(false);
  return (
    <figure>
      <div className="chamfer relative aspect-video overflow-hidden bg-ink-700">
        {play ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`Play video: ${title}`}>
            <Image src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="chamfer absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent text-white shadow-[0_0_30px_rgb(var(--accent-rgb)/0.6)] transition-transform group-hover:scale-110">
              <Play size={26} fill="currentColor" aria-hidden />
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3">
        <p className="line-clamp-2 font-semibold text-white">{title}</p>
        {channel && <p className="text-sm text-white/50">{channel}</p>}
      </figcaption>
    </figure>
  );
}
