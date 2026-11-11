"use client";
import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function HelpfulVote({ slug }: { slug: string }) {
  const key = `drp-guide-vote-${slug}`;
  const [vote, setVote] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === "yes" || v === "no") setVote(v);
    } catch {}
  }, [key]);

  const send = async (helpful: boolean) => {
    const v = helpful ? "yes" : "no";
    setVote(v);
    setError(false);
    const r = await fetch(`/api/guides/${slug}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ helpful }) }).catch(() => null);
    if (!r?.ok) {
      setError(true);
      setVote(null);
      return;
    }
    try {
      localStorage.setItem(key, v);
    } catch {}
  };

  return (
    <div className="plate mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
      <p className="font-display text-xl font-bold uppercase text-white">Was this helpful?</p>
      <div className="flex items-center gap-2">
        {([true, false] as const).map((h) => {
          const Icon = h ? ThumbsUp : ThumbsDown;
          const active = vote === (h ? "yes" : "no");
          return (
            <button
              key={String(h)}
              type="button"
              aria-pressed={active}
              onClick={() => send(h)}
              className={cn(
                "chamfer chamfer-sm flex items-center gap-2 px-4 py-2 text-sm ring-1 ring-inset transition-colors",
                active ? "bg-accent/20 text-white ring-accent/50" : "bg-white/[0.04] text-white/70 ring-white/10 hover:text-white",
              )}
            >
              <Icon size={15} aria-hidden /> {h ? "Yes" : "No"}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="w-full text-sm text-white/50">
        {error ? "Couldn't save your vote. Try again." : vote ? "Thanks for the feedback." : ""}
      </p>
    </div>
  );
}
