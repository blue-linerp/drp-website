import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/** Page title block, laid out like the in-game context-menu header: muted uppercase label, big bold title. */
export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.08] pb-12 pt-32 md:pb-16 md:pt-40">
      {/* Primary radial glows, as behind the in-game menus */}
      <div aria-hidden className="pointer-events-none absolute -left-[10%] -top-[60%] aspect-square w-[55%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgb(var(--accent-rgb)/0.14)_0%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-[70%] right-[-5%] aspect-square w-[40%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgb(var(--accent-rgb)/0.08)_0%,transparent_100%)]" />
      <div className="container relative">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-4 text-5xl font-bold leading-[0.95] md:text-7xl">{title}</h1>
        {subtitle && <p className="muted mt-5 max-w-2xl text-lg">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}

/** Small chip, like the metadata value tags in the in-game menus. */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "green" | "amber" | "red" | "blue"; className?: string }) {
  const tones = {
    neutral: "bg-white/[0.08] text-white/80 border-white/[0.08]",
    accent: "bg-accent/15 text-accent-text border-accent/35",
    green: "bg-status-online/10 text-[#7ee2a8] border-status-online/30",
    amber: "bg-status-checking/10 text-[#ffd27a] border-status-checking/30",
    red: "bg-status-offline/10 text-[#ff8a8a] border-status-offline/30",
    blue: "bg-tier-diamond/10 text-tier-diamond border-tier-diamond/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} />;
}

export function LoadingText({ children }: { children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      {children}
    </p>
  );
}

export function StatusDot({ state }: { state: "online" | "offline" | "checking" }) {
  const color = state === "online" ? "bg-status-online" : state === "offline" ? "bg-status-offline" : "bg-status-checking";
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden>
      {state !== "offline" && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", color)} />}
      <span className={cn("hex relative inline-flex h-2.5 w-2.5", color)} />
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("plate p-6 md:p-8", className)}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="plate flex flex-col items-center px-6 py-14 text-center">
      <p className="font-display text-2xl font-bold uppercase text-white">{title}</p>
      {children && <div className="muted mt-2 max-w-md">{children}</div>}
    </div>
  );
}

/** Thin rounded progress bar (in-game notification / progress style). */
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-white/[0.12]", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
