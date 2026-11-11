import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { accessFor, priorityFor, requireStaffPage } from "@/lib/session";
import { can, LEVEL_LABEL } from "@/lib/permissions";
import { daysBetween, discordAvatarUrl, formatDate, formatMinutes } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/misc";
import { StatusChip } from "@/components/ui/status-chip";
import { UserActions } from "@/components/admin/user-actions";
import { RevokeBan } from "@/components/admin/revoke-ban";
import { CharacterCard } from "@/components/profile/character-cards";

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const staff = await requireStaffPage("users.view");
  const u = await db.user.findUnique({
    where: { id: params.id },
    include: {
      supporterTier: true,
      applications: { include: { type: { select: { title: true } } }, orderBy: { submittedAt: "desc" } },
      bans: { orderBy: { createdAt: "desc" }, include: { issuedBy: { select: { username: true } } } },
      warnings: { orderBy: { createdAt: "desc" }, include: { issuedBy: { select: { username: true } } } },
      gameCharacters: { orderBy: [{ lastPlayedAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }] },
    },
  });
  if (!u) notFound();
  const access = accessFor(u);
  const prio = priorityFor(u);
  const points = [...u.bans, ...u.warnings].reduce((n, x) => n + x.points, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/50 hover:text-white">
        <ArrowLeft size={14} aria-hidden /> Users
      </Link>
      <header className="flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={discordAvatarUrl(u.discordId, u.avatar, 128)} alt="" width={72} height={72} className="chamfer h-[72px] w-[72px]" />
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl">{u.globalName || u.username}</h1>
          <p className="text-white/50">@{u.username} · <span className="font-mono">{u.discordId}</span></p>
          <div className="mt-2 flex flex-wrap gap-2">
            {u.whitelisted ? <Badge tone="green">Whitelisted</Badge> : <Badge>Not whitelisted</Badge>}
            {access.level && <Badge tone="accent">{LEVEL_LABEL[access.level]}</Badge>}
            {u.supporterTier && <Badge><span style={{ color: u.supporterTier.color }}>{u.supporterTier.name}</span></Badge>}
            {!u.inGuild && <Badge tone="amber">Not in guild</Badge>}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl">Identity</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Discord account age", `${daysBetween(u.discordCreatedAt, new Date())} days`],
                ["Joined guild", u.guildJoinedAt ? formatDate(u.guildJoinedAt) : "—"],
                ["FiveM licence", u.fivemLicense ?? "—"],
                ["Steam", u.steamHex ?? "—"],
                ["Cfx.re ID", u.fivemId ?? "—"],
                ["Last IP", can(staff.access, "bans.manage") ? (u.lastIp ?? "—") : "Hidden"],
                ["Playtime", formatMinutes(u.playtimeMinutes)],
                ["Last seen", u.lastSeenInGame ? formatDate(u.lastSeenInGame, { dateStyle: "medium", timeStyle: "short" }) : "—"],
                ["Site account created", formatDate(u.createdAt)],
                ["Roles synced", u.rolesSyncedAt ? formatDate(u.rolesSyncedAt, { dateStyle: "short", timeStyle: "short" }) : "Never"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <dt className="text-white/50">{k}</dt>
                  <dd className="break-all text-right font-mono text-xs text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Staff see the same character cards as the player, money included */}
          <div className="grid gap-4 md:grid-cols-2">
            {u.gameCharacters.map((c) => (
              <CharacterCard key={c.id} c={c} />
            ))}
            {!u.gameCharacters.length && <p className="text-sm text-white/50">No characters reported from the city yet.</p>}
          </div>

          <Card>
            <h2 className="text-2xl">Applications</h2>
            {u.applications.length ? (
              <ul className="mt-4 divide-y divide-white/5">
                {u.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/applications/${a.id}`} className="text-white hover:text-accent-text">{a.type.title} · {formatDate(a.submittedAt)}</Link>
                    <StatusChip status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-white/50">No applications.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl">Record</h2>
              <p className="font-mono text-sm text-white">{points} pts</p>
            </div>
            <ul className="mt-4 divide-y divide-white/5">
              {u.bans.map((b) => (
                <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <Badge tone="red">Ban{b.active ? "" : " · lifted"}</Badge>
                    <p className="mt-2 text-white/80">{b.reason}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {b.points} pts · by {b.issuedBy?.username ?? "system"} · {formatDate(b.createdAt)} · {b.expiresAt ? `until ${formatDate(b.expiresAt, { dateStyle: "medium", timeStyle: "short" })}` : "permanent"}
                    </p>
                  </div>
                  {b.active && can(staff.access, "bans.manage") && <RevokeBan id={b.id} />}
                </li>
              ))}
              {u.warnings.map((w) => (
                <li key={w.id} className="py-3 text-sm">
                  <Badge tone="amber">Warning</Badge>
                  <p className="mt-2 text-white/80">{w.reason}</p>
                  <p className="mt-1 text-xs text-white/40">{w.points} pts · by {w.issuedBy?.username ?? "system"} · {formatDate(w.createdAt)}</p>
                </li>
              ))}
              {!u.bans.length && !u.warnings.length && <li className="py-3 text-sm text-white/50">Clean record.</li>}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="!p-6">
            <h2 className="text-2xl">Queue priority</h2>
            <p className="mt-2 font-display text-5xl font-bold text-white">{prio.total}</p>
            <p className="mt-1 text-sm text-white/50">
              base {prio.base} · supporter +{prio.supporter} · staff +{prio.staff} · manual {prio.manual >= 0 ? "+" : ""}{prio.manual}
            </p>
          </Card>
          <UserActions
            userId={u.id}
            discordId={u.discordId}
            whitelisted={u.whitelisted}
            priorityBonus={u.priorityBonus}
            canWhitelist={can(staff.access, "whitelist.manage")}
            canQueue={can(staff.access, "queue.manage")}
            canBan={can(staff.access, "bans.manage")}
          />
        </aside>
      </div>
    </div>
  );
}
