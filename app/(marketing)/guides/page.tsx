import type { Metadata } from "next";
import { getGuides } from "@/lib/content";
import { PageHeader } from "@/components/ui/misc";
import { GuideBrowser } from "@/components/content/guide-browser";

export const metadata: Metadata = {
  title: "Guides",
  description: "From your first day to your next chapter. Find your way around the city.",
};
export const revalidate = 3600;

const GUIDE_CATEGORIES = [
  "Getting Started",
  "Jobs & Careers",
  "Economy",
  "Housing",
  "Vehicles",
  "Crime",
  "Departments",
  "Keybinds & Commands",
  "Technical/Troubleshooting",
];

export default async function GuidesPage() {
  const guides = await getGuides();
  return (
    <>
      <PageHeader eyebrow="Guides" title="Make yourself at home." subtitle="From your first day to your next chapter. Find your way around the city." />
      <div className="container py-12 md:py-16">
        <GuideBrowser
          categories={GUIDE_CATEGORIES.filter((c) => guides.some((g) => g.category === c))}
          guides={guides.map((g) => ({ slug: g.slug, title: g.title, excerpt: g.excerpt, cover: g.cover, category: g.category, readMinutes: g.readMinutes }))}
        />
      </div>
    </>
  );
}
