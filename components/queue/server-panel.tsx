"use client";
import { useStatus } from "@/components/use-status";
import { StatusPill } from "@/components/home/live-status";
import { Skeleton } from "@/components/ui/misc";

export function ServerPanel() {
  const s = useStatus(30_000);
  const stats = [
    { label: "Players", value: s ? (s.online ? `${s.players} / ${s.maxPlayers || "—"}` : "0") : null },
    { label: "In queue", value: s ? (s.online && s.queue !== null ? String(s.queue) : "—") : null },
    { label: "Server", value: s ? s.hostname || "Dream RP" : null },
  ];
  return (
    <div className="plate chamfer-lg p-6 md:p-8" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">The city right now</h2>
        <StatusPill online={s ? s.online : null} />
      </div>
      <dl className="mt-6 grid gap-6 sm:grid-cols-3">
        {stats.map((st) => (
          <div key={st.label}>
            <dt className="font-digits text-xs font-semibold uppercase tracking-[0.25em] text-white/45">{st.label}</dt>
            <dd className="mt-2 truncate font-display text-3xl font-bold text-white md:text-4xl">
              {st.value ?? <Skeleton className="h-9 w-24" />}
            </dd>
          </div>
        ))}
      </dl>
      {!s && <p className="mt-4 text-sm text-white/45">Checking players…</p>}
      {s && <p className="mt-4 font-mono text-xs text-white/35">Updated {new Date(s.checkedAt).toLocaleTimeString()} · refreshes every 30s</p>}
    </div>
  );
}
