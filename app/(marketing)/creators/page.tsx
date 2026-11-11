import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { getCreators, getPublicSettings } from "@/lib/content";
import { latestVideos, videoInfo, type Video } from "@/lib/youtube";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Badge, EmptyState } from "@/components/ui/misc";
import { LiveGrid } from "@/components/queue/live-strip";
import { LiteYouTube } from "@/components/content/lite-youtube";
import { CreatorLinks } from "@/components/content/creator-links";

export const metadata: Metadata = {
  title: "Creators",
  description: `Live moments. Unforgettable characters. See ${site.shortName} through the people who bring it to life.`,
};
export const revalidate = 3600;

export default async function CreatorsPage() {
  const [creators, { creatorsMeta }] = await Promise.all([getCreators(), getPublicSettings()]);
  const pinned = creatorsMeta.featuredVideoIds.filter(Boolean);
  let videos: Video[] = [];
  if (pinned.length) {
    videos = await Promise.all(pinned.map((id) => videoInfo(id)));
  } else {
    const featured = creators.filter((c) => c.featured && c.youtubeChannelId).slice(0, 3);
    const lists = await Promise.all(featured.map((c) => latestVideos(c.youtubeChannelId!, 1)));
    videos = lists.flat();
  }

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-36 md:pb-20 md:pt-44">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_80%_at_80%_0%,rgb(var(--accent-rgb)/0.18),transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgba(145,70,255,.12),transparent_70%)]" />
        <div className="container relative">
          <p className="eyebrow">Creators</p>
          <h1 className="mt-5 max-w-4xl text-5xl leading-[0.95] md:text-8xl">The city. Their stories.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/70">
            Live moments. Unforgettable characters. See {site.shortName} through the people who bring it to life.
          </p>
        </div>
      </section>

      {videos.length > 0 && (
        <section aria-labelledby="watch-title" className="container py-12">
          <Reveal>
            <p className="eyebrow">Featured</p>
            <h2 id="watch-title" className="mt-3 text-4xl md:text-5xl">Worth a watch.</h2>
          </Reveal>
          <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <LiteYouTube id={v.id} title={v.title} channel={v.channelTitle} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="live-title" className="container py-12">
        <Reveal>
          <p className="eyebrow">Twitch</p>
          <h2 id="live-title" className="mt-3 text-4xl md:text-5xl">Live from the city.</h2>
        </Reveal>
        <div className="mt-10">
          <LiveGrid />
        </div>
      </section>

      <section aria-labelledby="all-title" className="container py-12">
        <Reveal>
          <p className="eyebrow">Directory</p>
          <h2 id="all-title" className="mt-3 text-4xl md:text-5xl">All creators.</h2>
        </Reveal>
        {creators.length ? (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {creators.map((c) => (
              <li key={c.id} className="plate flex gap-4 p-5">
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt="" width={56} height={56} loading="lazy" className="chamfer chamfer-sm h-14 w-14 shrink-0 object-cover" />
                ) : (
                  <span className="chamfer chamfer-sm flex h-14 w-14 shrink-0 items-center justify-center bg-accent/15 font-display text-xl font-bold text-accent">
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    {c.name} {c.featured && <Badge tone="accent">Featured</Badge>}
                  </p>
                  {c.characters.length > 0 && <p className="mt-0.5 truncate text-sm text-white/50">Plays {c.characters.join(", ")}</p>}
                  <CreatorLinks creator={c} className="mt-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10">
            <EmptyState title="The stage is open.">Creators who stream {site.shortName} will appear here.</EmptyState>
          </div>
        )}
      </section>

      <section aria-labelledby="cta-title" className="container py-24 text-center">
        <Reveal>
          <h2 id="cta-title" className="text-5xl md:text-7xl">Be part of the story.</h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/65">Find your people. Make your mark on {site.shortName}.</p>
          <ButtonLink href="/applications/content-creator" size="lg" className="mt-8">
            Become a creator <ArrowRight size={16} aria-hidden />
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
