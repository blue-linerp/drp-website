import type { Character } from "@prisma/client";
import { Banknote, Briefcase, CalendarDays, Clock, Landmark, Phone, Radio, Users, Wallet } from "lucide-react";
import { HexIcon } from "@/components/ui/hexagon";
import { Badge } from "@/components/ui/misc";
import { formatDate, formatMinutes } from "@/lib/utils";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "just now", "12 min ago", "3 h ago", "2 days ago", then a date. */
export function timeAgo(d: Date | null) {
  if (!d) return "Never";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 90) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)} days ago`;
  return formatDate(d);
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Clock; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[6px] border border-white/[0.04] bg-white/[0.06] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        <Icon size={12} className="text-accent" aria-hidden /> {label}
      </dt>
      <dd className={`mt-1 truncate font-mono text-[15px] ${accent ? "text-white" : "text-white/85"}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

export function CharacterCard({ c, showMoney = true, online = false }: { c: Character; showMoney?: boolean; online?: boolean }) {
  const name = `${c.firstname} ${c.lastname}`.trim() || "Unknown";
  const initials = `${c.firstname[0] ?? ""}${c.lastname[0] ?? ""}`.toUpperCase() || "?";

  return (
    <article className="plate flex flex-col p-5 transition-[outline-color] hover:[outline-color:rgb(var(--accent-rgb))]">
      <header className="flex items-start gap-3">
        <HexIcon size={52}>
          <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{initials}</span>
        </HexIcon>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl leading-tight" title={name}>
            {name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className="font-mono">{c.citizenid}</Badge>
            {online && (
              <Badge tone="green">
                <span className="hex h-2 w-2 bg-status-online" aria-hidden /> In the city
              </Badge>
            )}
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-1.5 text-sm">
        <p className="flex items-center gap-2 text-white/85">
          <Briefcase size={14} className="shrink-0 text-accent" aria-hidden />
          <span className="truncate">
            {c.jobLabel || "Unemployed"}
            {c.jobGrade && <span className="text-white/50"> · {c.jobGrade}</span>}
          </span>
          {c.jobName && c.jobName !== "unemployed" && (
            <span className={`ml-auto flex shrink-0 items-center gap-1 text-xs ${c.onDuty ? "text-[#7ee2a8]" : "text-white/40"}`}>
              <Radio size={12} aria-hidden /> {c.onDuty ? "On duty" : "Off duty"}
            </span>
          )}
        </p>
        {c.gangLabel && (
          <p className="flex items-center gap-2 text-white/85">
            <Users size={14} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate">
              {c.gangLabel}
              {c.gangGrade && <span className="text-white/50"> · {c.gangGrade}</span>}
            </span>
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {showMoney && (
          <>
            <Stat icon={Wallet} label="Cash" value={usd.format(c.cash)} accent />
            <Stat icon={Landmark} label="Bank" value={usd.format(c.bank)} accent />
          </>
        )}
        <Stat icon={Clock} label="Play time" value={formatMinutes(c.playtimeMinutes)} />
        <Stat icon={CalendarDays} label="Last connected" value={timeAgo(c.lastPlayedAt)} />
      </dl>

      {(c.phone || c.birthdate || c.gender || c.nationality) && (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.08] pt-3 text-xs text-white/50">
          {c.phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} aria-hidden /> {c.phone}
            </span>
          )}
          {c.birthdate && <span>Born {c.birthdate}</span>}
          {c.gender && <span>{c.gender}</span>}
          {c.nationality && <span>{c.nationality}</span>}
        </p>
      )}
    </article>
  );
}

/** Characters section with a money/playtime summary across all characters. */
export function CharacterSection({ characters, showMoney = true, activeCitizenIds = [] }: { characters: Character[]; showMoney?: boolean; activeCitizenIds?: string[] }) {
  const totalCash = characters.reduce((n, c) => n + c.cash, 0);
  const totalBank = characters.reduce((n, c) => n + c.bank, 0);
  const totalTime = characters.reduce((n, c) => n + c.playtimeMinutes, 0);
  const updated = characters.reduce<Date | null>((d, c) => (!d || c.updatedAt > d ? c.updatedAt : d), null);

  return (
    <section id="characters" aria-labelledby="characters-title" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">In the city</p>
          <h2 id="characters-title" className="mt-3 text-4xl md:text-5xl">
            Characters
          </h2>
        </div>
        {characters.length > 0 && (
          <dl className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-[6px] border border-white/[0.06] bg-white/[0.06] px-3 py-1.5">
              <dt className="sr-only">Characters</dt>
              <dd className="text-white">{characters.length} character{characters.length === 1 ? "" : "s"}</dd>
            </div>
            {showMoney && (
              <div className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.06] bg-white/[0.06] px-3 py-1.5">
                <Banknote size={14} className="text-accent" aria-hidden />
                <dt className="sr-only">Total money</dt>
                <dd className="font-mono text-white">{usd.format(totalCash + totalBank)}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.06] bg-white/[0.06] px-3 py-1.5">
              <Clock size={14} className="text-accent" aria-hidden />
              <dt className="sr-only">Total play time</dt>
              <dd className="font-mono text-white">{formatMinutes(totalTime)}</dd>
            </div>
          </dl>
        )}
      </div>

      {characters.length ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <CharacterCard key={c.id} c={c} showMoney={showMoney} online={activeCitizenIds.includes(c.citizenid)} />
            ))}
          </div>
          {updated && <p className="mt-3 text-xs text-white/40">Money and jobs sync from the city every few minutes while you play. Last update {timeAgo(updated).toLowerCase()}.</p>}
        </>
      ) : (
        <div className="plate mt-6 flex flex-col items-center px-6 py-12 text-center">
          <HexIcon size={52}>
            <Users size={18} aria-hidden />
          </HexIcon>
          <p className="mt-3 font-display text-xl font-bold uppercase text-white">No characters yet</p>
          <p className="muted mt-1 max-w-md text-sm">Join the city and create a character. It&apos;ll show up here a minute after you load in, with its job, money and play time.</p>
        </div>
      )}
    </section>
  );
}
