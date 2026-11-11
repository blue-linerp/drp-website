import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/misc";
import { WhitelistTools } from "@/components/admin/whitelist-tools";

const PAGE = 30;

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; wl?: string; page?: string } }) {
  const staff = await requireStaffPage("users.view");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim();
  const where: Prisma.UserWhereInput = {
    ...(searchParams.wl === "yes" ? { whitelisted: true } : searchParams.wl === "no" ? { whitelisted: false } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { globalName: { contains: q, mode: "insensitive" } },
            { discordId: q },
            { fivemLicense: { contains: q } },
            { steamHex: { contains: q } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.user.count({ where }),
  ]);

  return (
    <div>
      <h1 className="text-5xl">Users &amp; whitelist.</h1>
      {can(staff.access, "whitelist.manage") && <WhitelistTools />}

      <form className="mt-8 flex flex-wrap items-end gap-3" action="/admin/users">
        <label className="min-w-[220px] flex-1">
          <span className="label">Search</span>
          <input name="q" defaultValue={q} placeholder="Username, Discord ID, FiveM licence or Steam hex" className="input" />
        </label>
        <label>
          <span className="label">Whitelist</span>
          <select name="wl" defaultValue={searchParams.wl ?? ""} className="input">
            <option value="">Everyone</option>
            <option value="yes">Whitelisted</option>
            <option value="no">Not whitelisted</option>
          </select>
        </label>
        <button type="submit" className="chamfer chamfer-sm h-[50px] bg-accent px-5 font-digits text-xs font-semibold uppercase tracking-[0.16em] text-white">
          Search
        </button>
      </form>

      <div className="plate mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line font-digits text-xs uppercase tracking-[0.15em] text-white/45">
            <tr>
              <th className="px-5 py-4 font-semibold">User</th>
              <th className="px-5 py-4 font-semibold">Discord ID</th>
              <th className="px-5 py-4 font-semibold">FiveM licence</th>
              <th className="px-5 py-4 font-semibold">Steam</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-semibold text-white hover:text-accent-text">{u.globalName || u.username}</Link>
                  <p className="text-xs text-white/40">@{u.username}</p>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{u.discordId}</td>
                <td className="max-w-[200px] truncate px-5 py-3 font-mono text-xs" title={u.fivemLicense ?? ""}>{u.fivemLicense ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{u.steamHex ?? "—"}</td>
                <td className="px-5 py-3">
                  {u.whitelisted ? <Badge tone="green">Whitelisted</Badge> : <Badge>No</Badge>}
                  {!u.inGuild && <Badge tone="amber" className="ml-1">Not in guild</Badge>}
                </td>
                <td className="px-5 py-3 text-white/60">{u.lastSeenInGame ? formatDate(u.lastSeenInGame) : "—"}</td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-white/50">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-sm text-white/50">
        <p>{total} users</p>
        <div className="flex gap-3">
          {page > 1 && <Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(searchParams.wl ? { wl: searchParams.wl } : {}), page: String(page - 1) })}`}>← Previous</Link>}
          {page * PAGE < total && <Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(searchParams.wl ? { wl: searchParams.wl } : {}), page: String(page + 1) })}`}>Next →</Link>}
        </div>
      </div>
    </div>
  );
}
