import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/misc";
import { RevokeBan } from "@/components/admin/revoke-ban";
import { QuickPunish } from "@/components/admin/quick-punish";

export default async function BansPage({ searchParams }: { searchParams: { show?: string } }) {
  await requireStaffPage("bans.manage");
  const showAll = searchParams.show === "all";
  const now = new Date();
  const [bans, warnings] = await Promise.all([
    db.ban.findMany({
      where: showAll ? {} : { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, username: true, discordId: true } }, issuedBy: { select: { username: true } } },
    }),
    db.warning.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { id: true, username: true } }, issuedBy: { select: { username: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-5xl">Bans &amp; warnings.</h1>
      <QuickPunish />
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">{showAll ? "All bans" : "Active bans"}</h2>
          <Link href={showAll ? "/admin/bans" : "/admin/bans?show=all"} className="text-sm text-accent-text hover:text-white">
            {showAll ? "Show active only" : "Show all (incl. expired / lifted)"}
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/5">
          {bans.map((b) => {
            const live = b.active && (!b.expiresAt || b.expiresAt > now);
            return (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/admin/users/${b.user.id}`} className="font-semibold text-white hover:text-accent-text">{b.user.username}</Link>{" "}
                  <Badge tone={live ? "red" : "neutral"}>{live ? (b.expiresAt ? "Temporary" : "Permanent") : b.active ? "Expired" : "Lifted"}</Badge>
                  <p className="mt-1 text-white/75">{b.reason}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {b.points} pts · by {b.issuedBy?.username ?? "system"} · {formatDate(b.createdAt)}
                    {b.expiresAt ? ` · until ${formatDate(b.expiresAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </p>
                </div>
                {live && <RevokeBan id={b.id} />}
              </li>
            );
          })}
          {!bans.length && <li className="py-4 text-white/50">No bans.</li>}
        </ul>
      </Card>
      <Card>
        <h2 className="text-2xl">Recent warnings</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {warnings.map((w) => (
            <li key={w.id} className="py-3 text-sm">
              <Link href={`/admin/users/${w.user.id}`} className="font-semibold text-white hover:text-accent-text">{w.user.username}</Link>{" "}
              <Badge tone="amber">{w.points} pts</Badge>
              <p className="mt-1 text-white/75">{w.reason}</p>
              <p className="mt-1 text-xs text-white/40">by {w.issuedBy?.username ?? "system"} · {formatDate(w.createdAt)}</p>
            </li>
          ))}
          {!warnings.length && <li className="py-4 text-white/50">No warnings.</li>}
        </ul>
      </Card>
    </div>
  );
}
