import { site } from "@/lib/site";
import { getPublicSettings, getTiers } from "@/lib/content";
import { Hero } from "@/components/home/hero";
import { FeatureRow } from "@/components/home/feature-row";
import { LiveStatus } from "@/components/home/live-status";
import { TierCards, type TierView } from "@/components/home/tier-cards";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";

export const revalidate = 3600;

export default async function HomePage() {
  const [{ home }, tiers] = await Promise.all([getPublicSettings(), getTiers()]);
  const tierViews: TierView[] = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    price: t.price,
    currency: t.currency,
    interval: t.interval,
    priority: t.priority,
    color: t.color,
    benefits: t.benefits,
    href: t.tebexUrl || site.storeUrl || "/support",
  }));

  return (
    <>
      <Hero
        image={home.heroImage}
        video={home.heroVideo || undefined}
        title={home.heroTitle}
        subtitle={
          home.heroSubtitle ||
          `A new face. A familiar city. A story that goes wherever you take it. Find your people and make yourself at home in ${site.shortName}.`
        }
      />

      <section id="city" aria-labelledby="city-title" className="container py-24 md:py-32">
        <Reveal className="max-w-3xl">
          <p className="eyebrow">The city</p>
          <h2 id="city-title" className="mt-4 text-5xl leading-[0.95] md:text-7xl">
            Find a place. Make it yours.
          </h2>
          <p className="mt-5 text-lg text-white/65">From your first shift to your next big idea, it starts with the people you meet along the way.</p>
        </Reveal>
        <div className="mt-20 space-y-24 md:space-y-32">
          <FeatureRow
            index={1}
            eyebrow="Life in the city"
            title="Every day starts with a possibility."
            body="Take a job, learn the streets, and get to know the locals. A ride to work or a wrong turn downtown can become a story people talk about for weeks."
            cta="Start your application"
            href="/applications"
            image={home.lifeImage}
            alt="The city skyline at sunset"
          />
          <FeatureRow
            index={2}
            flip
            eyebrow="Choose your path"
            title="A shift. A hustle. A fresh start."
            body="Wear the badge, run an ambulance shift, argue a case, open a business, or go the other way. Every department and every direction is a career you can build."
            cta="Browse applications"
            href="/applications"
            image={home.pathImage}
            alt="A city boulevard where emergency services patrol"
          />
          <FeatureRow
            index={3}
            eyebrow="The community"
            title="Find your people. Build your story."
            body="Behind every character is a player who loves the craft. Join the Discord, find your crew, and help shape what the city becomes next."
            cta="Join the community"
            href={site.discordInvite}
            image={home.communityImage}
            alt="A group gathered by the lake at dusk"
          />
        </div>
      </section>

      <section aria-label="Server status" className="container py-12 md:py-20">
        <Reveal>
          <LiveStatus />
        </Reveal>
      </section>

      {tierViews.length > 0 && (
        <section aria-labelledby="tiers-title" className="container py-24 md:py-32">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">Supporters</p>
            <h2 id="tiers-title" className="mt-4 text-5xl leading-[0.95] md:text-7xl">
              Back the city. Make more possible.
            </h2>
            <p className="mt-5 text-lg text-white/65">
              Support {site.shortName} and enjoy a few extras along the way. Flip a card to explore the benefits of each tier.
            </p>
          </Reveal>
          <div className="mt-14">
            <TierCards tiers={tierViews} />
          </div>
          <p className="mt-8 text-sm text-white/45">
            Perks are cosmetic or convenience only. Supporting does not bypass the whitelist or the rules.
          </p>
        </section>
      )}

      <section aria-labelledby="cta-title" className="relative overflow-hidden py-28 md:py-40">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,rgb(var(--accent-rgb)/0.22),transparent_70%)]" />
        <Reveal className="container relative text-center">
          <h2 id="cta-title" className="mx-auto max-w-4xl text-5xl leading-[0.95] md:text-8xl">
            We&apos;ll see you in the city.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/65">Read the rules, join the community, and take your first step.</p>
          <ButtonLink href="/applications" size="lg" className="mt-10">
            Join {site.shortName}
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
