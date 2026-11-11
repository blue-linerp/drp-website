import type { Metadata } from "next";
import { getPublicSettings, getRules } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Markdown } from "@/components/content/markdown";
import { RulesBrowser } from "@/components/content/rules-browser";
import { Changelog, PrintButton } from "@/components/content/rules-extras";

export const metadata: Metadata = {
  title: "Server rules",
  description: "Please read and follow these rules to ensure a positive experience for everyone.",
};
export const revalidate = 3600;

const CATEGORIES = [
  { key: "GENERAL", label: "General" },
  { key: "GANGS", label: "Gangs" },
  { key: "GOVERNMENT", label: "Government / Departments" },
  { key: "BUSINESSES", label: "Businesses" },
  { key: "DISCORD", label: "Discord" },
];

export default async function RulesPage() {
  const [rules, { rulesMeta }] = await Promise.all([getRules(), getPublicSettings()]);
  const sections = rules.map((r) => ({
    slug: r.slug,
    title: r.title,
    category: r.category,
    pointsLabel: r.pointsLabel,
    text: `${r.title} ${r.body}`.toLowerCase(),
    node: <Markdown>{r.body}</Markdown>,
  }));

  return (
    <>
      <PageHeader eyebrow="Handbook" title="Server rules." subtitle="Please read and follow these rules to ensure a positive experience for everyone.">
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
          <span>Last updated {formatDate(rulesMeta.lastUpdated, { dateStyle: "long" })}</span>
          <PrintButton />
        </div>
      </PageHeader>
      <div className="container py-12 md:py-16">
        <RulesBrowser categories={CATEGORIES.filter((c) => sections.some((s) => s.category === c.key))} sections={sections} />
        {rulesMeta.changelog.length > 0 && <Changelog entries={rulesMeta.changelog} />}
      </div>
    </>
  );
}
