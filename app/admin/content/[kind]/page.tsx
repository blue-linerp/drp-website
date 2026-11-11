import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/session";
import { CONTENT_KINDS, delegate, type ContentKind } from "@/lib/admin-content";
import { cn } from "@/lib/utils";
import { ContentManager } from "@/components/admin/content-manager";

const TABS: { kind: ContentKind; label: string }[] = [
  { kind: "rules", label: "Rules" },
  { kind: "guides", label: "Guides" },
  { kind: "faq", label: "FAQ" },
  { kind: "tiers", label: "Supporter tiers" },
  { kind: "creators", label: "Creators" },
];

export default async function ContentPage({ params }: { params: { kind: string } }) {
  await requireStaffPage("content.manage");
  if (!CONTENT_KINDS.includes(params.kind as ContentKind)) notFound();
  const kind = params.kind as ContentKind;
  const items = await delegate(kind).findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <h1 className="text-5xl">Content.</h1>
      <nav aria-label="Content type" className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={`/admin/content/${t.kind}`}
            aria-current={t.kind === kind ? "page" : undefined}
            className={cn("relative px-4 py-3 font-digits text-sm font-semibold", t.kind === kind ? "text-white" : "text-white/50 hover:text-white")}
          >
            {t.label}
            {t.kind === kind && <span className="glow-line absolute inset-x-2 -bottom-px" />}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        <ContentManager key={kind} kind={kind} items={JSON.parse(JSON.stringify(items))} />
      </div>
    </div>
  );
}
