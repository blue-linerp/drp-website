"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/misc";
import { useStatus } from "@/components/use-status";

export function StatusPill({ online }: { online: boolean | null }) {
  const state = online === null ? "checking" : online ? "online" : "offline";
  return (
    <span className="chamfer chamfer-sm inline-flex items-center gap-2.5 bg-white/[0.06] px-3 py-1.5 font-digits text-xs font-bold uppercase tracking-[0.2em] text-white ring-1 ring-inset ring-white/10">
      <StatusDot state={state} />
      {state === "checking" ? "Checking the city…" : state === "online" ? "Online" : "Offline"}
    </span>
  );
}

export function LiveStatus() {
  const status = useStatus();
  return (
    <div className="plate chamfer-lg relative overflow-hidden p-8 md:p-12">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="eyebrow">Play</p>
          <h2 className="mt-4 text-5xl md:text-6xl">Your next session.</h2>
          <p className="mt-5 max-w-md text-white/65">Pick up where you left off. Check your whitelist access and head back into the city.</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <ButtonLink href="/queue" size="lg">
              Enter the city <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <Link href="/applications" className="text-sm text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-accent">
              New here? Apply for whitelist
            </Link>
          </div>
        </div>
        <div className="space-y-6" aria-live="polite">
          <StatusPill online={status ? status.online : null} />
          <dl className="grid grid-cols-2 gap-6">
            <div>
              <dt className="font-digits text-xs font-bold uppercase tracking-[0.25em] text-white/45">Players</dt>
              <dd className="mt-2 font-display text-5xl font-bold text-white">
                {status ? (
                  <>
                    {status.online ? status.players : 0}
                    <span className="text-2xl text-white/40"> / {status.maxPlayers || "—"}</span>
                  </>
                ) : (
                  <span className="text-xl not-italic text-white/40">Checking players…</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-digits text-xs font-bold uppercase tracking-[0.25em] text-white/45">In queue</dt>
              <dd className="mt-2 font-display text-5xl font-bold text-white">
                {status?.online && status.queue !== null ? status.queue : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
