import { HexIcon } from "@/components/ui/hexagon";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { AppIcon } from "@/components/apps/icon";

export default async function TypesPage() {
  await requireStaffPage("types.manage");
  const types = await db.applicationType.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }], include: { _count: { select: { applications: true } } } });
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-5xl">App builder.</h1>
        <ButtonLink href="/admin/types/new">New application type</ButtonLink>
      </div>
      <ul className="mt-8 grid gap-3">
        {types.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/types/${t.id}`} className="plate flex items-center gap-4 p-5 transition-colors hover:[outline-color:rgb(var(--accent-rgb))]">
              <HexIcon size={48}>
                <AppIcon name={t.icon} size={20} />
              </HexIcon>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t.title}</p>
                <p className="text-sm text-white/45">
                  /{t.slug} · {t.category.toLowerCase()}
                  {t.department ? ` · ${t.department}` : ""} · {(t.questions as unknown[]).length} questions · {t._count.applications} applications
                </p>
              </div>
              <Badge tone={t.isOpen ? "green" : "neutral"}>{t.isOpen ? "Open" : "Closed"}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
