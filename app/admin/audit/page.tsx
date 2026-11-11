import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { formatDate } from "@/lib/utils";

const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: { page?: string; action?: string } }) {
  await requireStaffPage("audit.view");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = searchParams.action ? { action: { startsWith: searchParams.action } } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { actor: { select: { username: true, id: true } } } }),
    db.auditLog.count({ where }),
  ]);
  const href = (p: number) => `/admin/audit?${new URLSearchParams({ ...(searchParams.action ? { action: searchParams.action } : {}), page: String(p) })}`;

  return (
    <div>
      <h1 className="text-5xl">Audit log.</h1>
      <form className="mt-6 flex gap-3" action="/admin/audit">
        <label className="flex-1">
          <span className="label">Filter by action prefix</span>
          <input name="action" defaultValue={searchParams.action} placeholder="e.g. application, whitelist, ban, content" className="input" />
        </label>
        <button type="submit" className="chamfer chamfer-sm mt-auto h-[50px] bg-accent px-5 font-digits text-xs font-semibold uppercase tracking-[0.16em] text-white">Filter</button>
      </form>
      <div className="plate mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line font-digits text-xs uppercase tracking-[0.15em] text-white/45">
            <tr>
              <th className="px-5 py-3 font-semibold">When</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Target</th>
              <th className="px-5 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-white/5 align-top last:border-0">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-white/60">{formatDate(l.createdAt, { dateStyle: "short", timeStyle: "medium" })}</td>
                <td className="px-5 py-3 text-white">{l.actor ? <Link href={`/admin/users/${l.actor.id}`} className="hover:text-accent-text">{l.actor.username}</Link> : "System"}</td>
                <td className="px-5 py-3 font-mono text-xs text-accent-text">{l.action}</td>
                <td className="px-5 py-3 text-xs text-white/70">
                  {l.targetType === "User" && l.targetId ? <Link href={`/admin/users/${l.targetId}`} className="hover:text-white">User</Link> : l.targetType === "Application" && l.targetId ? <Link href={`/admin/applications/${l.targetId}`} className="hover:text-white">Application</Link> : l.targetType}
                </td>
                <td className="max-w-[360px] break-words px-5 py-3 font-mono text-[11px] text-white/50">{Object.keys(l.meta as object).length ? JSON.stringify(l.meta) : ""}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-white/50">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-sm text-white/50">
        <p>{total} entries</p>
        <div className="flex gap-3">
          {page > 1 && <Link href={href(page - 1)}>← Newer</Link>}
          {page * PAGE < total && <Link href={href(page + 1)}>Older →</Link>}
        </div>
      </div>
    </div>
  );
}
