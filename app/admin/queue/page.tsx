import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { getState } from "@/lib/settings";
import { SNAPSHOT_FRESH_MS, type QueueSnapshot } from "@/lib/fivem";
import { sortQueue } from "@/lib/priority";
import { formatMinutes } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui/misc";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { KickButton } from "@/components/admin/kick-button";

export default async function QueuePage() {
  await requireStaffPage("queue.manage");
  const snap = await getState<QueueSnapshot | null>("queue", null);
  const fresh = !!snap && Date.now() - snap.updatedAt < SNAPSHOT_FRESH_MS;
  const queue = snap ? sortQueue(snap.queue) : [];
  const licenses = [...queue.map((q) => q.license), ...(snap?.players.map((p) => p.license) ?? [])];
  const users = licenses.length ? await db.user.findMany({ where: { fivemLicense: { in: licenses } }, select: { id: true, username: true, fivemLicense: true, priorityBonus: true } }) : [];
  const byLicense = new Map(users.map((u) => [u.fivemLicense!, u]));

  return (
    <div className="space-y-6">
      <AutoRefresh ms={10_000} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-5xl">Queue.</h1>
        <p className="text-sm text-white/50">
          {snap ? `Last heartbeat ${Math.round((Date.now() - snap.updatedAt) / 1000)}s ago` : "No heartbeat received yet"}
          {snap && !fresh && " (stale: is the gate resource running?)"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-6"><p className="label">In queue</p><p className="font-display text-4xl font-bold text-white">{fresh ? queue.length : "—"}</p></Card>
        <Card className="!p-6"><p className="label">Online</p><p className="font-display text-4xl font-bold text-white">{fresh ? `${snap!.players.length} / ${snap!.maxClients ?? "?"}` : "—"}</p></Card>
        <Card className="!p-6"><p className="label">Highest priority</p><p className="font-display text-4xl font-bold text-white">{queue[0]?.priority ?? "—"}</p></Card>
      </div>

      {queue.length ? (
        <div className="plate overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line font-digits text-xs uppercase tracking-[0.15em] text-white/45">
              <tr>
                <th className="px-5 py-4 font-semibold">#</th>
                <th className="px-5 py-4 font-semibold">Player</th>
                <th className="px-5 py-4 font-semibold">Priority</th>
                <th className="px-5 py-4 font-semibold">Tier</th>
                <th className="px-5 py-4 font-semibold">Waiting</th>
                <th className="px-5 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((q, i) => {
                const u = byLicense.get(q.license);
                return (
                  <tr key={q.license} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-mono text-white">{i + 1}</td>
                    <td className="px-5 py-3">
                      {u ? <Link href={`/admin/users/${u.id}`} className="font-semibold text-white hover:text-accent-text">{u.username}</Link> : <span className="text-white">{q.name ?? "Unknown"}</span>}
                      <p className="max-w-[260px] truncate font-mono text-[11px] text-white/35">{q.license}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-white">{q.priority}{u?.priorityBonus ? <span className="text-white/40"> (manual {u.priorityBonus >= 0 ? "+" : ""}{u.priorityBonus})</span> : null}</td>
                    <td className="px-5 py-3 text-white/70">{q.tier ?? "—"}</td>
                    <td className="px-5 py-3 text-white/70">{formatMinutes(Math.max(0, Math.round((Date.now() - q.joinedAt) / 60_000)))}</td>
                    <td className="px-5 py-3 text-right"><KickButton license={q.license} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nobody waiting.">The queue is empty, or the server has free slots.</EmptyState>
      )}
      <p className="text-sm text-white/45">
        To change someone&apos;s priority, open their user page and set a manual bonus. Changes apply to queued players at the next heartbeat (≤30s).
      </p>
    </div>
  );
}
