import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { getPublicSettings } from "@/lib/content";
import { getQueueRoles } from "@/lib/queue-roles";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ServerPanel } from "@/components/queue/server-panel";
import { AccessCard } from "@/components/queue/access-card";
import { LiveGrid } from "@/components/queue/live-strip";

export const metadata: Metadata = {
  title: "Play",
  description: `Check your whitelist access, see who's online, and connect to ${site.shortName}.`,
};
export const revalidate = 3600;

export default async function QueuePage() {
  const { home } = await getPublicSettings();
  const queueRoles = await getQueueRoles().catch(() => []);
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-36 md:pb-24 md:pt-44">
        <div className="absolute inset-0" aria-hidden>
          <Image src={home.playImage} alt="" fill priority sizes="100vw" unoptimized={home.playImage.endsWith(".svg")} className="animate-kenburns object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/40" />
        </div>
        <div className="container relative">
          <p className="eyebrow">Play</p>
          <h1 className="mt-5 max-w-4xl text-5xl leading-[0.95] md:text-7xl">Your next chapter starts here.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/70">
            A familiar face. An unexpected turn. A story that&apos;s yours. Make yourself at home in {site.shortName} Whitelist.
          </p>
        </div>
      </section>

      <div className="container space-y-6">
        <ServerPanel />
        <AccessCard />
        {queueRoles.length > 0 && (
          <section aria-labelledby="prio-title" className="plate p-6 md:p-8">
            <p className="eyebrow">Queue</p>
            <h2 id="prio-title" className="mt-3 text-3xl">Priority roles.</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              You need the whitelist to queue. These Discord roles move you up the queue. Only your highest role counts, and it&apos;s added to your supporter tier.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {queueRoles.map((r) => (
                <li key={r.discordRoleId} className="item flex items-center gap-3 px-4 py-3">
                  <span className="hex h-3 w-3 shrink-0" style={{ background: r.color }} aria-hidden />
                  <span className="flex-1 font-semibold text-white">{r.label}</span>
                  <span className="font-mono text-white">+{r.priority}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section aria-labelledby="live-title" className="container py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Creators</p>
            <h2 id="live-title" className="mt-3 text-4xl md:text-5xl">Live from the city.</h2>
          </div>
          <ButtonLink href="/creators" variant="secondary">
            Explore creators <ArrowRight size={16} aria-hidden />
          </ButtonLink>
        </Reveal>
        <div className="mt-10">
          <LiveGrid limit={3} />
        </div>
      </section>
    </>
  );
}
