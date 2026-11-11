"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye } from "lucide-react";
import { LoadingText, Skeleton } from "@/components/ui/misc";

export interface LiveStream {
  creatorId: string;
  creatorName: string;
  userLogin: string;
  title: string;
  viewers: number;
  thumbnail: string;
  avatar: string | null;
  url: string;
}

export function useLiveStreams() {
  const [streams, setStreams] = useState<LiveStream[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/creators/live")
        .then((r) => r.json())
        .then((j: { streams: LiveStream[] }) => alive && setStreams(j.streams))
        .catch(() => alive && setStreams([]));
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return streams;
}

export function StreamCard({ s }: { s: LiveStream }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="group block" aria-label={`${s.creatorName} is live: ${s.title}`}>
      <div className="chamfer relative aspect-video overflow-hidden bg-ink-700">
        <Image src={s.thumbnail} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="chamfer chamfer-sm absolute left-3 top-3 bg-accent px-2 py-0.5 font-digits text-[11px] font-bold uppercase tracking-[0.15em] text-white">Live</span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
          <Eye size={12} aria-hidden /> {s.viewers.toLocaleString()}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        {s.avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.avatar} alt="" width={36} height={36} loading="lazy" className="chamfer chamfer-sm h-9 w-9 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-white group-hover:text-accent-text">{s.creatorName}</p>
          <p className="line-clamp-2 text-sm text-white/55">{s.title}</p>
        </div>
      </div>
    </a>
  );
}

export function LiveGrid({ limit }: { limit?: number }) {
  const streams = useLiveStreams();
  if (!streams)
    return (
      <div>
        <LoadingText>Finding stories from the city…</LoadingText>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    );
  if (!streams.length) return <p className="plate px-6 py-10 text-center text-white/55">No one&apos;s live right now. Check back soon.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(limit ? streams.slice(0, limit) : streams).map((s) => (
        <li key={s.creatorId}>
          <StreamCard s={s} />
        </li>
      ))}
    </ul>
  );
}
