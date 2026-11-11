import Link from "next/link";
import { site } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/applications", label: "Applications" },
      { href: "/queue", label: `Play ${site.shortName}` },
      { href: "/rules", label: "Server rules" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/creators", label: "Creators" },
      { href: "/guides", label: "Guides" },
      { href: "/faq", label: "Common questions" },
      { href: "/support", label: "Get support" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-line bg-ink-800">
      <div className="glow-line absolute inset-x-0 top-0 opacity-40" />
      <div className="container grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm font-display text-2xl font-bold uppercase leading-tight text-white">{site.tagline}</p>
          <ButtonLink href={site.discordInvite} variant="secondary" className="mt-6">
            Join our Discord
          </ButtonLink>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="eyebrow">{col.title}</p>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/65 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container flex flex-col gap-4 py-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/refund" className="hover:text-white">Refunds</Link></li>
          </ul>
        </div>
        <p className="container pb-8 text-xs text-white/35">
          {site.name} is not affiliated with or endorsed by Rockstar Games, Take-Two Interactive or Cfx.re. Grand Theft Auto and GTA V are trademarks of Take-Two Interactive.
        </p>
      </div>
    </footer>
  );
}
