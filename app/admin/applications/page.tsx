import Link from "next/link";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/status-machine";
import { formatDate } from "@/lib/utils";
import { StatusChip } from "@/components/ui/status-chip";

const STATUSES = Object.keys(STATUS_LABEL).filter((s) => s !== "DRAFT") as ApplicationStatus[];
const PAGE = 25;

type SP = { type?: string; status?: string; reviewer?: string; sort?: string; page?: string; q?: string };

export default async function AdminApplications({ searchParams }: { searchParams: SP }) {
  const user = await requireStaffPage("apps.review");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = searchParams.status === "all" ? undefined : ((searchParams.status as ApplicationStatus) || undefined);
  const openOnly = !searchParams.status;

  const where: Prisma.ApplicationWhereInput = {
    ...(user.access.level === "DEPT_HEAD" ? { type: { department: { in: user.access.departments } } } : {}),
    ...(searchParams.type ? { typeId: searchParams.type } : {}),
    ...(status && STATUSES.includes(status) ? { status } : openOnly ? { status: { in: ["PENDING", "UNDER_REVIEW", "INTERVIEW"] } } : {}),
    ...(searchParams.reviewer === "me" ? { reviewerId: user.id } : searchParams.reviewer === "none" ? { reviewerId: null } : {}),
    ...(searchParams.q
      ? {
          OR: [
            { reference: { contains: searchParams.q, mode: "insensitive" } },
            { user: { username: { contains: searchParams.q, mode: "insensitive" } } },
            { user: { discordId: searchParams.q } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ApplicationOrderByWithRelationInput = { submittedAt: searchParams.sort === "newest" ? "desc" : "asc" };

  const [apps, total, types] = await Promise.all([
    db.application.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { type: { select: { title: true } }, user: { select: { username: true, discordId: true } }, reviewer: { select: { username: true } } },
    }),
    db.application.count({ where }),
    db.applicationType.findMany({
      where: user.access.level === "DEPT_HEAD" ? { department: { in: user.access.departments } } : {},
      select: { id: true, title: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/applications?${p.toString()}`;
  };

  return (
    <div>
      <h1 className="text-5xl">Applications.</h1>
      <form className="mt-8 flex flex-wrap items-end gap-3" action="/admin/applications">
        <label className="min-w-[180px] flex-1">
          <span className="label">Search</span>
          <input name="q" defaultValue={searchParams.q} placeholder="Reference, username or Discord ID" className="input" />
        </label>
        <label>
          <span className="label">Type</span>
          <select name="type" defaultValue={searchParams.type ?? ""} className="input">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input">
            <option value="">Open (needs action)</option>
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Reviewer</span>
          <select name="reviewer" defaultValue={searchParams.reviewer ?? ""} className="input">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unclaimed</option>
          </select>
        </label>
        <label>
          <span className="label">Sort</span>
          <select name="sort" defaultValue={searchParams.sort ?? ""} className="input">
            <option value="">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <button type="submit" className="chamfer chamfer-sm h-[50px] bg-accent px-5 font-digits text-xs font-semibold uppercase tracking-[0.16em] text-white">
          Filter
        </button>
      </form>

      <div className="plate mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line font-digits text-xs uppercase tracking-[0.15em] text-white/45">
            <tr>
              <th className="px-5 py-4 font-semibold">Applicant</th>
              <th className="px-5 py-4 font-semibold">Type</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Submitted</th>
              <th className="px-5 py-4 font-semibold">Reviewer</th>
              <th className="px-5 py-4"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-white">{a.user.username}</p>
                  <p className="font-mono text-xs text-white/40">{a.reference}</p>
                </td>
                <td className="px-5 py-3.5">{a.type.title}</td>
                <td className="px-5 py-3.5"><StatusChip status={a.status} /></td>
                <td className="px-5 py-3.5">{formatDate(a.submittedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-5 py-3.5 text-white/60">{a.reviewer?.username ?? "—"}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/applications/${a.id}`} className="text-accent-text hover:text-white">Review →</Link>
                </td>
              </tr>
            ))}
            {!apps.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-white/50">No applications match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-white/50">
        <p>{total} total</p>
        <div className="flex gap-3">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="hover:text-white">← Previous</Link>}
          {page * PAGE < total && <Link href={qs({ page: String(page + 1) })} className="hover:text-white">Next →</Link>}
        </div>
      </div>
    </div>
  );
}
