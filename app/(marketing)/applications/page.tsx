import { HexIcon } from "@/components/ui/hexagon";
import type { Metadata } from "next";
import type { ApplicationCategory } from "@prisma/client";
import { getApplicationTypes } from "@/lib/content";
import { PageHeader, Badge } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";
import { AppIcon } from "@/components/apps/icon";
import { ApplyAction } from "@/components/apps/apply-action";

export const metadata: Metadata = {
  title: "Applications",
  description: "Apply for whitelist, departments, staff positions and special roles.",
};
export const revalidate = 3600;

const GROUPS: { key: ApplicationCategory; title: string; blurb: string }[] = [
  { key: "WHITELIST", title: "Whitelist", blurb: "Start here. Everything else follows." },
  { key: "DEPARTMENT", title: "Departments", blurb: "Police, EMS and the DOJ." },
  { key: "STAFF", title: "Staff", blurb: "Help run the city behind the scenes." },
  { key: "SPECIAL", title: "Special roles", blurb: "Gangs, businesses and content creators." },
];

function isOpenNow(t: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null }) {
  const now = Date.now();
  return t.isOpen && (!t.opensAt || t.opensAt.getTime() <= now) && (!t.closesAt || t.closesAt.getTime() > now);
}

export default async function ApplicationsPage() {
  const types = await getApplicationTypes();
  return (
    <>
      <PageHeader eyebrow="Join the city" title="Applications." subtitle="Apply for whitelist, departments, staff positions and special roles." />
      <div className="container space-y-20 py-16 md:py-24">
        {GROUPS.map((g) => {
          const list = types.filter((t) => t.category === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key} aria-labelledby={`group-${g.key}`}>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                <h2 id={`group-${g.key}`} className="text-4xl">
                  {g.title}
                </h2>
                <p className="text-white/50">{g.blurb}</p>
              </div>
              <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {list.map((t, i) => {
                  const open = isOpenNow(t);
                  return (
                    <Reveal as="li" key={t.id} delay={i * 0.05}>
                      <article className="plate group flex h-full flex-col p-7 transition-colors hover:[outline-color:rgb(var(--accent-rgb))]">
                        <div className="flex items-start justify-between gap-4">
                          <HexIcon size={56}>
                            <AppIcon name={t.icon} />
                          </HexIcon>
                          <Badge tone={open ? "green" : "neutral"}>{open ? "Open" : "Closed"}</Badge>
                        </div>
                        <h3 className="mt-6 text-3xl">{t.title}</h3>
                        <p className="mt-3 flex-1 text-white/60">{t.description}</p>
                        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Requirements">
                          {t.minAge ? <Badge>{t.minAge}+</Badge> : null}
                          {t.minDiscordAgeDays > 0 && <Badge>Discord {t.minDiscordAgeDays}d+</Badge>}
                          {t.requiresWhitelist && <Badge tone="accent">Whitelisted</Badge>}
                          {t.requiredRoleIds.length > 0 && <Badge tone="accent">Role required</Badge>}
                          {t.cooldownDays > 0 && <Badge>{t.cooldownDays}d cooldown</Badge>}
                        </ul>
                        <div className="mt-7">
                          <ApplyAction slug={t.slug} typeId={t.id} open={open} />
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
