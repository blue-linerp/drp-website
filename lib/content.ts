import "server-only";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { db } from "./db";

/**
 * Cached reads for content pages. Pages render statically/ISR and are revalidated
 * on demand when admins save (revalidateContent).
 */
export const TAGS = {
  rules: "rules",
  guides: "guides",
  faq: "faq",
  tiers: "tiers",
  creators: "creators",
  types: "app-types",
  settings: "settings",
} as const;

const REVALIDATE = 3600;

export const getRules = unstable_cache(
  () => db.ruleSection.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] }),
  ["rules"],
  { tags: [TAGS.rules], revalidate: REVALIDATE },
);

export const getGuides = unstable_cache(
  () =>
    db.guide.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, title: true, excerpt: true, cover: true, category: true, readMinutes: true, updatedAt: true, order: true },
    }),
  ["guides"],
  { tags: [TAGS.guides], revalidate: REVALIDATE },
);

export const getGuide = unstable_cache(
  (slug: string) => db.guide.findFirst({ where: { slug, published: true } }),
  ["guide"],
  { tags: [TAGS.guides], revalidate: REVALIDATE },
);

export const getFaq = unstable_cache(
  () => db.faqItem.findMany({ orderBy: [{ order: "asc" }] }),
  ["faq"],
  { tags: [TAGS.faq], revalidate: REVALIDATE },
);

export const getTiers = unstable_cache(
  () => db.supporterTier.findMany({ orderBy: { order: "asc" } }),
  ["tiers"],
  { tags: [TAGS.tiers], revalidate: REVALIDATE },
);

export const getCreators = unstable_cache(
  () => db.creator.findMany({ where: { approved: true }, orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }] }),
  ["creators"],
  { tags: [TAGS.creators], revalidate: REVALIDATE },
);

export const getApplicationTypes = unstable_cache(
  () => db.applicationType.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] }),
  ["app-types"],
  { tags: [TAGS.types], revalidate: REVALIDATE },
);

const PATHS: Record<keyof typeof TAGS, string[]> = {
  rules: ["/rules"],
  guides: ["/guides"],
  faq: ["/faq"],
  tiers: ["/"],
  creators: ["/creators", "/queue"],
  types: ["/applications"],
  settings: ["/"],
};

export function revalidateContent(kind: keyof typeof TAGS) {
  revalidateTag(TAGS[kind]);
  for (const p of PATHS[kind]) revalidatePath(p);
  if (kind === "guides") revalidatePath("/guides/[slug]", "page");
  if (kind === "settings") revalidatePath("/", "layout");
}

export const getPublicSettings = unstable_cache(
  async () => {
    const { getSetting } = await import("./settings");
    const [announcement, maintenance, home, rulesMeta, creatorsMeta] = await Promise.all([
      getSetting("announcement"),
      getSetting("maintenance"),
      getSetting("home"),
      getSetting("rulesMeta"),
      getSetting("creatorsMeta"),
    ]);
    return { announcement, maintenance, home, rulesMeta, creatorsMeta };
  },
  ["public-settings"],
  { tags: [TAGS.settings], revalidate: REVALIDATE },
);
