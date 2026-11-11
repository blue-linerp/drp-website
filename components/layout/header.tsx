"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, FileText, Gamepad2, Home, LogOut, Menu as MenuIcon, ScrollText, Shield, User, type LucideIcon } from "lucide-react";
import { nav, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { HexIcon } from "@/components/ui/hexagon";
import { useMe, type Me } from "@/components/use-me";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** ox_lib panel: dark horizontal gradient glass, hairline outline, soft shadow, 8px radius. */
const PANEL =
  "rounded-[8px] [background:linear-gradient(90deg,rgba(18,18,18,0.93)_0%,rgba(18,18,18,0.8)_100%)] [outline:1px_solid_rgba(255,255,255,0.04)] shadow-[0_1px_8px_0_rgba(0,0,0,0.2),0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-[14px]";

/** ox_lib list item: white 8% fill, faint border that turns primary on hover. */
const ITEM =
  "rounded-[6px] border border-transparent transition-[border-color,background-color,color] duration-150 hover:border-accent hover:bg-white/[0.08] focus-visible:border-accent focus-visible:bg-white/[0.08] focus-visible:outline-none";

/**
 * Site navigation in the server's ox_lib "Abstract" style.
 * Desktop: one dark glass panel (brand · menu items · account/Join).
 * Mobile: the same panel on top and a panel tab bar at the bottom; "More" opens an ox-style sheet.
 */
export function Header({ banners }: { banners?: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        {banners && <div className="pointer-events-auto relative">{banners}</div>}

        <div className="px-3 pt-3 md:px-6 md:pt-4">
          <div className={cn(PANEL, "pointer-events-auto relative mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-3 transition-shadow duration-300 md:px-4", scrolled && "shadow-[0_1px_8px_0_rgba(0,0,0,0.3),0_16px_40px_-12px_rgba(0,0,0,0.8)]")}>
            {/* Brand */}
            <Link href="/" aria-label={`${site.name} home`} className="group flex shrink-0 items-center gap-2.5 pr-2">
              <HexIcon size={40} className="transition-transform group-hover:-translate-y-0.5">
                <span className="text-[14px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{site.logoText}</span>
              </HexIcon>
              <span className="leading-none">
                <span className="block font-display text-lg font-bold uppercase text-white">{site.shortName}</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Roleplay</span>
              </span>
            </Link>

            {/* Menu items (desktop) */}
            <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
              <ul className="flex items-center gap-1">
                {nav.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          ITEM,
                          "relative flex items-center gap-2 px-3.5 py-2 text-[15px] font-semibold",
                          active ? "border-accent bg-white/[0.08] text-white" : "text-white/70 hover:text-white",
                        )}
                      >
                        {active && <span aria-hidden className="hex h-[9px] w-[10px] bg-accent drop-shadow-[0_0_5px_rgb(var(--accent-rgb))]" />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <span className="flex-1 lg:hidden" />

            {/* Account + Join */}
            <div className="flex shrink-0 items-center gap-2">
              {me && <UserMenu me={me} />}
              <ButtonLink href="/applications" size="md" className="h-10 px-4 md:px-5">
                Join<span className="-ml-1 hidden sm:inline">{site.shortName}</span>
              </ButtonLink>
            </div>

            {/* Thin primary glow along the bottom edge */}
            <span aria-hidden className="pointer-events-none absolute inset-x-6 -bottom-px h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
          </div>
        </div>
      </header>

      <MobileTabBar pathname={pathname} onMore={() => setOpen(true)} />

      {/* "More" sheet (mobile), laid out like the in-game context menu */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/70" />
          <Dialog.Content className={cn(PANEL, "fixed inset-x-3 bottom-3 z-[70] animate-pop-in p-5 focus:outline-none")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <HexIcon size={44}>
                  <MenuIcon size={16} aria-hidden />
                </HexIcon>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{site.shortName}</p>
                  <Dialog.Title className="font-display text-2xl font-bold uppercase leading-tight text-white">Menu</Dialog.Title>
                </div>
              </div>
              <Dialog.Close className="flex items-center gap-2 text-right" aria-label="Close menu">
                <span className="leading-none">
                  <span className="block text-sm font-bold text-white">Close</span>
                  <span className="text-xs text-white/55">Tap or press ESC</span>
                </span>
                <kbd className="!text-sm">ESC</kbd>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
            <hr className="my-4 border-white/15" />
            <nav aria-label="All pages">
              <ul className="grid grid-cols-2 gap-2">
                {[...nav, { href: "/support", label: "Support" }].map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(ITEM, "flex items-center gap-2 bg-white/[0.08] px-4 py-3 text-[15px] font-semibold", active ? "border-accent text-white" : "text-white/80")}
                      >
                        {active && <span aria-hidden className="hex h-[9px] w-[10px] bg-accent" />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-4 grid gap-2">
              {me ? (
                <>
                  <ButtonLink href="/profile" variant="secondary">My profile</ButtonLink>
                  {me.isStaff && <ButtonLink href="/admin" variant="secondary">Admin</ButtonLink>}
                  <ButtonLink href="/signout" variant="ghost">Sign out</ButtonLink>
                </>
              ) : (
                <ButtonLink href="/signin">Sign in with Discord</ButtonLink>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/* ─── Mobile bottom tab bar ───────────────────────────────────────────────── */

const MOBILE_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/applications", label: "Apply", icon: FileText },
  { href: "/queue", label: "Play", icon: Gamepad2 },
  { href: "/rules", label: "Rules", icon: ScrollText },
];

function MobileTabBar({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  const active = MOBILE_TABS.findIndex((t) => isActive(pathname, t.href));
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <nav aria-label="Tabs" className={cn(PANEL, "pointer-events-auto mx-auto max-w-md p-1.5")}>
        <ul className="grid grid-cols-5 gap-1">
          {MOBILE_TABS.map((t, i) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={i === active ? "page" : undefined}
                className={cn(
                  ITEM,
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold active:scale-95",
                  i === active ? "border-accent bg-white/[0.08] text-white" : "text-white/65",
                )}
              >
                <t.icon size={20} aria-hidden className={i === active ? "text-accent" : undefined} />
                {t.label}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={onMore} className={cn(ITEM, "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white/65 active:scale-95")}>
              <MenuIcon size={20} aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

/* ─── Account menu ────────────────────────────────────────────────────────── */

function UserMenu({ me }: { me: Me }) {
  const row =
    "flex items-center gap-3 rounded-[6px] border border-transparent px-3 py-2.5 text-sm font-medium text-white/85 outline-none transition-colors data-[highlighted]:border-accent data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white";
  return (
    <Menu.Root>
      <Menu.Trigger className={cn(ITEM, "hidden h-10 items-center gap-2 bg-white/[0.08] pl-1 pr-2.5 text-white sm:flex data-[state=open]:border-accent")} aria-label="Account menu">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={me.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-[5px]" />
        <span className="max-w-[8rem] truncate text-sm font-semibold">{me.displayName}</span>
        <ChevronDown size={14} className="text-white/55" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={10} className={cn(PANEL, "z-[80] min-w-[240px] animate-pop-in p-2")}>
          <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
            <User size={13} className="text-accent" aria-hidden /> Account
          </div>
          <div className="space-y-1">
            {[
              { href: "/profile", label: "My Profile", icon: User },
              { href: "/profile#applications", label: "My Applications", icon: FileText },
              ...(me.isStaff ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
            ].map((i) => (
              <Menu.Item key={i.href} asChild>
                <Link href={i.href} className={cn(row, "bg-white/[0.08]")}>
                  <i.icon size={16} className="text-accent" aria-hidden /> {i.label}
                </Link>
              </Menu.Item>
            ))}
          </div>
          <Menu.Separator className="my-2 h-px bg-white/15" />
          <Menu.Item asChild>
            <Link href="/signout" className={row}>
              <LogOut size={16} className="text-accent" aria-hidden /> Sign out
            </Link>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
