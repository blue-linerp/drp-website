"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

interface Section {
  slug: string;
  title: string;
  category: string;
  pointsLabel: string | null;
  text: string;
  node: ReactNode;
}

const HL = "drp-search";

/** Highlights matches with the CSS Custom Highlight API (no DOM mutation of React-rendered content). */
function useHighlight(root: React.RefObject<HTMLElement>, query: string, deps: unknown[]) {
  useEffect(() => {
    const css = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS;
    const HighlightCtor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (!css?.highlights || !HighlightCtor || !root.current) return;
    css.highlights.delete(HL);
    const q = query.trim().toLowerCase();
    if (q.length < 2) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root.current, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.toLowerCase() ?? "";
      let i = text.indexOf(q);
      while (i !== -1) {
        const r = new Range();
        r.setStart(n, i);
        r.setEnd(n, i + q.length);
        ranges.push(r);
        i = text.indexOf(q, i + q.length);
      }
    }
    css.highlights.set(HL, new HighlightCtor(...ranges));
    return () => void css.highlights?.delete(HL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ...deps]);
}

export function RulesBrowser({ categories, sections }: { categories: { key: string; label: string }[]; sections: Section[] }) {
  const [tab, setTab] = useState(categories[0]?.key ?? "GENERAL");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Open the right tab for deep links like /rules#rdm-random-deathmatch
  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.slice(1));
    const s = sections.find((x) => x.slug === slug);
    if (s) {
      setTab(s.category);
      setTimeout(() => document.getElementById(slug)?.scrollIntoView(), 50);
    }
  }, [sections]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? sections.filter((s) => s.text.includes(q)) : sections.filter((s) => s.category === tab)), [q, tab, sections]);
  const visibleSet = useMemo(() => new Set(visible.map((s) => s.slug)), [visible]);

  useHighlight(contentRef, query, [visible.length, tab]);

  // Scroll-spy
  useEffect(() => {
    const els = visible.map((s) => document.getElementById(s.slug)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/rules#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      history.replaceState(null, "", `#${slug}`);
      setCopied(slug);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  return (
    <div>
      <style>{`::highlight(${HL}){background-color:rgb(228 8 10 / .35);color:#fff}`}</style>
      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Rule categories" className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c.key}
              role="tab"
              type="button"
              aria-selected={!q && tab === c.key}
              onClick={() => {
                setTab(c.key);
                setQuery("");
              }}
              className={cn(
                "chamfer chamfer-sm px-4 py-2.5 font-digits text-sm font-semibold transition-colors",
                !q && tab === c.key ? "bg-accent text-white" : "bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-sm">
          <span className="sr-only">Search the rules</span>
          <Search size={17} className="pointer-events-none absolute z-10 left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the rules" className="input pl-11 pr-10" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white">
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      <p aria-live="polite" className="mt-3 h-5 text-sm text-white/50">
        {q ? `${visible.length} section${visible.length === 1 ? "" : "s"} match “${query.trim()}”` : ""}
      </p>

      <div className="mt-6 grid gap-10 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Rules contents" className="no-print hidden lg:block">
          <div className="sticky top-28">
            <p className="eyebrow">On this page</p>
            <ol className="mt-4 space-y-0.5 border-l border-white/10">
              {visible.map((s) => (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    aria-current={active === s.slug ? "location" : undefined}
                    className={cn("-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors", active === s.slug ? "border-accent text-white" : "border-transparent text-white/50 hover:text-white")}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div ref={contentRef} className="min-w-0 space-y-6">
          {/* Every section is rendered so printing includes the whole rulebook; filtered ones are hidden on screen. */}
          {sections.map((s) => (
            <section key={s.slug} id={s.slug} aria-labelledby={`${s.slug}-h`} className={cn("plate scroll-mt-28 p-6 md:p-8", !visibleSet.has(s.slug) && "hidden print:block")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 id={`${s.slug}-h`} className="text-2xl md:text-3xl">{s.title}</h2>
                  <button type="button" onClick={() => copyLink(s.slug)} className="no-print p-1.5 text-white/30 hover:text-white" aria-label={`Copy link to ${s.title}`}>
                    <Link2 size={16} />
                  </button>
                  {copied === s.slug && <span className="text-xs text-[#7ee2a8]" role="status">Link copied</span>}
                </div>
                {s.pointsLabel && <Badge tone={/discretion/i.test(s.pointsLabel) ? "amber" : "accent"}>{s.pointsLabel}</Badge>}
              </div>
              <div className="mt-4">{s.node}</div>
            </section>
          ))}
          {!visible.length && <p className="plate px-6 py-10 text-center text-white/55">No rules match that search.</p>}
        </div>
      </div>
    </div>
  );
}
