import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bug, CreditCard, FileQuestion, Flag, MessageSquare, Scale } from "lucide-react";
import { site } from "@/lib/site";
import { PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Support",
  description: "For account, purchase, or application issues, the team can help through a Discord support ticket.",
};

const LINKS = [
  { icon: Scale, title: "Ban appeal", body: "Tell us what happened and why you should get another chance. A different staff member reviews every appeal.", href: site.discordTicketUrl },
  { icon: CreditCard, title: "Purchase / refund issue", body: "Perks missing or a billing problem? Include your Tebex transaction ID.", href: site.discordTicketUrl, extra: { href: "/refund", label: "Refund policy" } },
  { icon: FileQuestion, title: "Application question", body: "Check your application status on your profile first. Still unsure? Ask us.", href: site.discordTicketUrl, extra: { href: "/profile#applications", label: "My applications" } },
  { icon: Flag, title: "Report a player", body: "Include the time, names or IDs, and a clip if you have one. Please don't report in public channels.", href: site.discordTicketUrl },
  { icon: Bug, title: "Bug report", body: "Found something broken? Tell us how to reproduce it, and attach your CitizenFX.log if the game crashed.", href: site.discordTicketUrl, extra: { href: "/guides/connecting-troubleshooting", label: "Troubleshooting guide" } },
];

export default function SupportPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="We're here to help." subtitle="For account, purchase, or application issues, the team can help through a Discord support ticket." />
      <div className="container py-12 md:py-16">
        <Reveal>
          <div className="plate chamfer-lg relative overflow-hidden p-8 md:p-12">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#5865F2]/20 blur-3xl" />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <MessageSquare className="text-accent" size={28} aria-hidden />
                <h2 className="mt-4 text-4xl md:text-5xl">Talk to the team.</h2>
                <p className="mt-4 text-white/65">
                  Open a ticket in our Discord and tell us what&apos;s happening. Include any relevant details or screenshots so a staff member can help you.
                </p>
              </div>
              <ButtonLink href={site.discordTicketUrl} size="lg" className="shrink-0">
                Open a ticket <ArrowUpRight size={16} aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </Reveal>

        <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {LINKS.map((l, i) => (
            <Reveal as="li" key={l.title} delay={i * 0.05}>
              <div className="plate flex h-full flex-col p-7">
                <l.icon className="text-accent" size={24} aria-hidden />
                <h3 className="mt-4 text-2xl">{l.title}</h3>
                <p className="mt-2 flex-1 text-white/60">{l.body}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-digits text-sm font-semibold text-white hover:text-accent-text">
                    Open a ticket <ArrowUpRight size={14} aria-hidden />
                  </a>
                  {l.extra && (
                    <Link href={l.extra.href} className="text-sm text-white/50 underline underline-offset-4 hover:text-white">
                      {l.extra.label}
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </>
  );
}
