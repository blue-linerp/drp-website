import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, LifeBuoy } from "lucide-react";
import { db } from "@/lib/db";
import { getGuide, getGuides } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { Markdown, extractToc } from "@/components/content/markdown";
import { HelpfulVote } from "@/components/content/helpful-vote";
import { ButtonLink } from "@/components/ui/button";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const guides = await db.guide.findMany({ where: { published: true }, select: { slug: true } });
    return guides.map((g) => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const g = await getGuide(params.slug);
  if (!g) return { title: "Guide not found" };
  return { title: g.title, description: g.excerpt, openGraph: g.cover && !g.cover.endsWith(".svg") ? { images: [g.cover] } : undefined };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const [guide, all] = await Promise.all([getGuide(params.slug), getGuides()]);
  if (!guide) notFound();
  const toc = extractToc(guide.body);
  const idx = all.findIndex((g) => g.slug === guide.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <article>
      <header className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        {guide.cover && (
          <div className="absolute inset-0" aria-hidden>
            <Image src={guide.cover} alt="" fill priority sizes="100vw" unoptimized={guide.cover.endsWith(".svg")} className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/40" />
          </div>
        )}
        <div className="container relative">
          <Link href="/guides" className="inline-flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/55 hover:text-white">
            <ArrowLeft size={14} aria-hidden /> All guides
          </Link>
          <p className="eyebrow mt-8">{guide.category}</p>
          <h1 className="mt-4 max-w-4xl text-5xl leading-[0.95] md:text-7xl">{guide.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">{guide.excerpt}</p>
          <p className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5"><Clock size={13} aria-hidden /> {guide.readMinutes} min read</span>
            <span>Updated {formatDate(guide.updatedAt, { dateStyle: "long" })}</span>
          </p>
        </div>
      </header>

      <div className="container grid gap-12 pb-16 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 max-w-3xl">
          <Markdown>{guide.body}</Markdown>
          <HelpfulVote slug={guide.slug} />
          <nav aria-label="More guides" className="mt-12 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
            {prev ? (
              <Link href={`/guides/${prev.slug}`} className="plate group p-5">
                <span className="flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/45"><ArrowLeft size={13} aria-hidden /> Previous</span>
                <span className="mt-2 block font-semibold text-white group-hover:text-accent-text">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/guides/${next.slug}`} className="plate group p-5 text-right">
                <span className="flex items-center justify-end gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Next <ArrowRight size={13} aria-hidden /></span>
                <span className="mt-2 block font-semibold text-white group-hover:text-accent-text">{next.title}</span>
              </Link>
            )}
          </nav>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          {toc.length > 1 && (
            <nav aria-label="On this page" className="plate p-6">
              <p className="eyebrow">On this page</p>
              <ol className="mt-4 space-y-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id} className={t.depth === 3 ? "pl-4" : ""}>
                    <a href={`#${t.id}`} className="text-white/60 hover:text-white">{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="plate p-6">
            <LifeBuoy className="text-accent" aria-hidden />
            <h2 className="mt-3 text-2xl">Need a hand?</h2>
            <p className="mt-2 text-sm text-white/60">The community and the team are always around to help. Ask in Discord or open a ticket.</p>
            <ButtonLink href="/support" variant="secondary" size="sm" className="mt-4">Get support</ButtonLink>
          </div>
        </aside>
      </div>
    </article>
  );
}
