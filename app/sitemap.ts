import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { db } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = ["", "/applications", "/rules", "/guides", "/faq", "/creators", "/queue", "/support", "/privacy", "/terms", "/refund"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${site.url}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/queue" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const [guides, types] = await Promise.all([
      db.guide.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      db.applicationType.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    entries.push(...guides.map((g) => ({ url: `${site.url}/guides/${g.slug}`, lastModified: g.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })));
    entries.push(...types.map((t) => ({ url: `${site.url}/applications/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })));
  } catch {
    // DB unavailable at build: static entries only.
  }
  return entries;
}
