"use client";
import { HexIcon } from "@/components/ui/hexagon";
import { Users } from "lucide-react";
import { useStatus } from "@/components/use-status";
import { cn } from "@/lib/utils";

/** Big live player count with a status dot, for the profile's "Your next session" block. */
export function LivePlayers() {
  const s = useStatus();
  const state = !s ? "checking" : s.online ? "online" : "offline";
  return (
    <div className="flex items-center gap-5" aria-live="polite">
      <span className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full border border-white/10" />
        <span aria-hidden className="absolute inset-[-6px] rounded-full border border-dashed border-accent/30 motion-safe:animate-[spin_24s_linear_infinite]" />
        <HexIcon size={48}>
          <Users size={22} aria-hidden />
        </HexIcon>
        <span
          aria-hidden
          className={cn(
            "hex absolute bottom-1 right-1 h-3 w-3",
            state === "online" ? "bg-status-online" : state === "offline" ? "bg-status-offline" : "bg-status-checking",
          )}
        />
      </span>
      <p className="font-display text-7xl font-bold leading-none text-white md:text-8xl">
        {s ? (s.online ? s.players : 0) : "—"}
      </p>
      <p className="leading-tight">
        <span className="block font-display text-xl font-bold uppercase text-white">Players</span>
        <span className="text-sm text-white/55">
          {state === "checking" ? "Checking the city…" : state === "online" ? "in the city" : "city offline"}
        </span>
      </p>
    </div>
  );
}
