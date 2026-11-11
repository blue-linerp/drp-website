import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getServerStatus } from "@/lib/fivem";
import { Card } from "@/components/ui/misc";
import { StatusPill } from "@/components/home/live-status";
import { BarChart } from "@/components/admin/bar-chart";

export default async function AdminOverview({ searchParams }: { searchParams: { denied?: string } }) {
  const user = (await getCurrentUser())!;
  const deptScope = user.access.level === "DEPT_HEAD" ? { type: { department: { in: user.access.departments } } } : {};
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since14 = new Date(Date.now() - 13 * 86_400_000);
  since14.setHours(0, 0, 0, 0);

  const [pendingByType, types, newUsers, whitelisted, status, recent] = await Promise.all([
    db.application.groupBy({ by: ["typeId"], where: { status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] }, ...deptScope }, _count: true }),
    db.applicationType.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
    db.user.count({ where: { createdAt: { gte: since7 } } }),
    db.user.count({ where: { whitelisted: true } }),
    getServerStatus(),
    db.application.findMany({ where: { submittedAt: { gte: since14 }, ...deptScope }, select: { submittedAt: true } }),
  ]);

  const days: { date: string; value: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, value: recent.filter((r) => r.submittedAt.toISOString().slice(0, 10) === key).length });
  }
  const totalPending = pendingByType.reduce((n, p) => n + p._count, 0);

  return (
    <div className="space-y-8">
      {searchParams.denied && (
        <p role="alert" className="bg-accent/10 px-4 py-3 text-sm text-accent-text">
          You don&apos;t have permission for that page.
        </p>
      )}
      <div>
        <h1 className="text-5xl">Overview.</h1>
        <p className="mt-2 text-white/55">Welcome back, {user.globalName || user.username}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Awaiting review", value: totalPending, href: "/admin/applications" },
          { label: "Players online", value: status.online ? `${status.players} / ${status.maxPlayers}` : "—" },
          { label: "In queue", value: status.queue ?? "—" },
          { label: "New users (7d)", value: newUsers },
        ].map((s) => (
          <Card key={s.label} className="!p-6">
            <p className="font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-bold text-white">{s.value}</p>
            {s.href && (
              <Link href={s.href} className="mt-2 inline-block text-sm text-accent-text hover:text-white">
                Review →
              </Link>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <BarChart data={days} label="Applications submitted, last 14 days" />
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">Server</h2>
            <StatusPill online={status.online} />
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-white/50">Hostname</dt><dd className="text-right text-white">{status.hostname || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Whitelisted players</dt><dd className="font-mono text-white">{whitelisted}</dd></div>
            <div className="flex justify-between"><dt className="text-white/50">Checked</dt><dd className="text-white/70">{new Date(status.checkedAt).toLocaleTimeString()}</dd></div>
          </dl>
          {can(user.access, "queue.manage") && (
            <Link href="/admin/queue" className="mt-5 inline-block text-sm text-accent-text hover:text-white">
              Open queue manager →
            </Link>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-2xl">Pending by type</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {types
            .map((t) => ({ ...t, n: pendingByType.find((p) => p.typeId === t.id)?._count ?? 0 }))
            .filter((t) => t.n > 0)
            .map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <Link href={`/admin/applications?type=${t.id}`} className="text-white hover:text-accent-text">
                  {t.title}
                </Link>
                <span className="font-mono text-white">{t.n}</span>
              </li>
            ))}
          {totalPending === 0 && <li className="py-3 text-white/50">Inbox zero. Nothing waiting.</li>}
        </ul>
      </Card>
    </div>
  );
}
