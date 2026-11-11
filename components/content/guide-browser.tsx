"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface G {
  slug: string;
  title: string;
  excerpt: string;
  cover: string | null;
  category: string;
  readMinutes: number;
}

export function GuideBrowser({ guides, categories }: { guides: G[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return guides.filter((g) => (!cat || g.category === cat) && (!t || `${g.title} ${g.excerpt} ${g.category}`.toLowerCase().includes(t)));
  }, [guides, q, cat]);

  return (
    <div>
      <div className="flex flex-col gap-5">
        <label className="relative block max-w-xl">
          <span className="label">Find a guide</span>
          <Search size={17} className="pointer-events-none absolute z-10 bottom-[15px] left-4 text-white/40" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jobs, housing, keybinds…" className="input pl-11" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
              className={cn(
                "chamfer chamfer-sm px-3.5 py-2 font-digits text-[13px] font-semibold transition-colors",
                cat === c ? "bg-accent text-white" : "bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">{list.length} guides</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group block h-full">
              <article className="plate flex h-full flex-col overflow-hidden transition-colors group-hover:[outline-color:rgb(var(--accent-rgb))]">
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-600">
                  {g.cover && (
                    <Image src={g.cover} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized={g.cover.endsWith(".svg")} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-transparent" />
                  <span className="chamfer chamfer-sm absolute left-4 top-4 bg-black/60 px-2.5 py-1 font-digits text-[11px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur">
                    {g.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="text-2xl group-hover:text-accent-text">{g.title}</h2>
                  <p className="mt-2 flex-1 text-white/60">{g.excerpt}</p>
                  <p className="mt-4 flex items-center gap-2 font-mono text-xs text-white/40">
                    <Clock size={13} aria-hidden /> {g.readMinutes} min read
                  </p>
                </div>
              </article>
            </Link>
          </li>
        ))}
      </ul>
      {!list.length && <p className="plate mt-10 px-6 py-10 text-center text-white/55">No guides match that. Try another word or category.</p>}
    </div>
  );
}
