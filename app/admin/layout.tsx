import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/session";
import { can, LEVEL_LABEL, type Action } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/nav";

export const metadata: Metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ITEMS: { href: string; label: string; icon: string; action: Action }[] = [
  { href: "/admin", label: "Overview", icon: "gauge", action: "admin.view" },
  { href: "/admin/applications", label: "Applications", icon: "inbox", action: "apps.review" },
  { href: "/admin/types", label: "App builder", icon: "blocks", action: "types.manage" },
  { href: "/admin/users", label: "Users & whitelist", icon: "users", action: "users.view" },
  { href: "/admin/queue", label: "Queue", icon: "list-ordered", action: "queue.manage" },
  { href: "/admin/bans", label: "Bans & warnings", icon: "gavel", action: "bans.manage" },
  { href: "/admin/content/rules", label: "Content", icon: "file-text", action: "content.manage" },
  { href: "/admin/settings", label: "Site settings", icon: "settings", action: "content.manage" },
  { href: "/admin/audit", label: "Audit log", icon: "scroll", action: "audit.view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const items = ITEMS.filter((i) => can(user.access, i.action)).map(({ href, label, icon }) => ({ href, label, icon }));
  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-24 pt-28 md:px-6 md:pt-32 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="eyebrow">Staff · {LEVEL_LABEL[user.access.level!]}</p>
        <AdminNav items={items} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
