"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Link2, Search } from "lucide-react";

interface Item {
  slug: string;
  category: string;
  question: string;
  text: string;
  node: ReactNode;
}

export function FaqBrowser({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string[]>([]);

  // Deep links: /faq#how-do-i-get-whitelisted opens and scrolls to that question.
  useEffect(() => {
    const go = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (items.some((i) => i.slug === slug)) {
        setOpen((o) => (o.includes(slug) ? o : [...o, slug]));
        setTimeout(() => document.getElementById(slug)?.scrollIntoView({ block: "start" }), 60);
      }
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [items]);

  const t = q.trim().toLowerCase();
  const filtered = useMemo(() => (t ? items.filter((i) => i.text.includes(t)) : items), [items, t]);
  const groups = Array.from(new Set(filtered.map((i) => i.category)));

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search questions</span>
        <Search size={18} className="pointer-events-none absolute z-10 left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="What would you like to know?" className="input py-4 pl-12 text-lg" />
      </label>
      <p aria-live="polite" className="mt-2 h-5 text-sm text-white/50">{t ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}` : ""}</p>

      <Accordion.Root type="multiple" value={t ? filtered.map((i) => i.slug) : open} onValueChange={setOpen} className="mt-6 space-y-10">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`faq-${g}`}>
            <h2 id={`faq-${g}`} className="mb-4 text-2xl">{g}</h2>
            <div className="space-y-2">
              {filtered
                .filter((i) => i.category === g)
                .map((i) => (
                  <Accordion.Item key={i.slug} value={i.slug} id={i.slug} className="plate scroll-mt-28">
                    <Accordion.Header className="flex items-center">
                      <Accordion.Trigger className="group flex flex-1 items-center justify-between gap-4 px-6 py-5 text-left">
                        <span className="font-semibold text-white">{i.question}</span>
                        <ChevronDown size={18} className="shrink-0 text-white/50 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="px-6 pb-6">
                      {i.node}
                      <a href={`#${i.slug}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white">
                        <Link2 size={13} aria-hidden /> Link to this answer
                      </a>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
            </div>
          </section>
        ))}
      </Accordion.Root>
      {!filtered.length && <p className="plate mt-6 px-6 py-10 text-center text-white/55">No answers match that. Try different words, or ask the team.</p>}
    </div>
  );
}
