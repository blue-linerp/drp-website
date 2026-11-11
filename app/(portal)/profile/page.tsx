import { HexBadge } from "@/components/ui/hexagon";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, Check, CheckCircle2, Circle, Clock, Gamepad2, Link2, Lock, ShieldAlert, ShieldCheck, UserX, X } from "lucide-react";
import { db } from "@/lib/db";
import { getQueueRoles } from "@/lib/queue-roles";
import { activeBan, getCurrentUser, priorityFor } from "@/lib/session";
import { LEVEL_LABEL } from "@/lib/permissions";
import { supporterActive } from "@/lib/priority";
import { connectUrl, site } from "@/lib/site";
import { getPublicSettings } from "@/lib/content";
import { cn, discordAvatarUrl, formatDate, formatMinutes } from "@/lib/utils";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ProfileSettings } from "@/components/profile/settings";
import { LivePlayers } from "@/components/profile/live-players";
import { CopyConnect } from "@/components/profile/copy-connect";
import { AppHistory, type HistoryApp } from "@/components/profile/app-history";
import { LinkAction } from "@/components/profile/link-action";
import { CharacterSection } from "@/components/profile/character-cards";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { getQueueSnapshot } from "@/lib/fivem";
import { activeCharacterIds } from "@/lib/character-presence";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };
export const dynamic = "force-dynamic";

const OPEN = ["PENDING", "UNDER_REVIEW", "INTERVIEW"];

export default async function ProfilePage({ searchParams }: { searchParams: { denied?: string; linked?: string; link_error?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/profile");

  const [apps, bans, warnings, ban, { home }, deptTypes, characters, snapshot] = await Promise.all([
    db.application.findMany({ where: { userId: user.id }, include: { type: { select: { title: true, grantsWhitelist: true } } }, orderBy: { submittedAt: "desc" } }),
    db.ban.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.warning.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    activeBan(user.id),
    getPublicSettings(),
    db.applicationType.findMany({ where: { department: { not: null }, grantRoleId: { not: null } }, select: { title: true, grantRoleId: true } }),
    db.character.findMany({ where: { userId: user.id }, orderBy: [{ lastPlayedAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }] }),
    getQueueSnapshot(),
  ]);

  const priority = priorityFor(user, await getQueueRoles());
  const tierActive = !!user.supporterTier && supporterActive(user.supporterUntil);
  const points = [...bans, ...warnings].reduce((n, x) => n + x.points, 0);
  const departments = deptTypes.filter((t) => user.roleIds.includes(t.grantRoleId!));
  const whitelistApp = apps.find((a) => a.type.grantsWhitelist && OPEN.includes(a.status));
  const counts = {
    total: apps.length,
    accepted: apps.filter((a) => a.status === "ACCEPTED").length,
    open: apps.filter((a) => OPEN.includes(a.status)).length,
  };
  const history: HistoryApp[] = apps.map((a) => ({
    id: a.id,
    title: a.type.title,
    reference: a.reference,
    status: a.status,
    submittedAt: a.submittedAt.toISOString(),
    decidedAt: a.decidedAt?.toISOString() ?? null,
    decisionReason: a.decisionReason,
    interviewAt: a.interviewAt?.toISOString() ?? null,
  }));
  const name = user.globalName || user.username;
  const canPlay = user.whitelisted && !ban && user.inGuild;

  return (
    <div className="mx-auto max-w-[1200px]">
      {searchParams.denied === "admin" && (
        <p role="alert" className="mb-8 bg-accent/10 px-4 py-3 text-sm text-accent-text">
          You don&apos;t have access to the staff dashboard.
        </p>
      )}

      {/* ── Identity ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={discordAvatarUrl(user.discordId, user.avatar, 256)} alt="" width={96} height={96} className="chamfer h-24 w-24 shrink-0 self-start sm:self-auto" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your corner of {site.shortName}</p>
          <h1 className="mt-2 truncate text-5xl normal-case md:text-6xl">{name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {user.whitelisted && <Badge tone="green">Whitelisted</Badge>}
            {tierActive && (
              <Badge>
                <span style={{ color: user.supporterTier!.color }}>{user.supporterTier!.name}</span>
              </Badge>
            )}
            {user.access.level && <Badge tone="accent">{LEVEL_LABEL[user.access.level]}</Badge>}
            {departments.map((d) => (
              <Badge key={d.title} tone="blue">{d.title}</Badge>
            ))}
            <span className="ml-1 text-white/55">Member since {formatDate(user.guildJoinedAt ?? user.createdAt, { month: "long", year: "numeric" })}</span>
          </div>
        </div>
        <ButtonLink href="#settings" variant="secondary" className="self-start sm:self-auto">
          Edit profile
        </ButtonLink>
      </header>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <dl className="mt-10 grid grid-cols-2 border-y border-line md:grid-cols-4">
        {[
          { label: "Applications", value: String(counts.total) },
          { label: "Accepted", value: String(counts.accepted) },
          { label: "Awaiting review", value: String(counts.open) },
          { label: "Game account", value: user.fivemLicense ? "Connected" : "Not linked", small: true },
        ].map((s, i) => (
          <div key={s.label} className={cn("px-0 py-7 md:px-8 md:first:pl-0", i % 2 === 1 && "pl-6 md:pl-8", i > 0 && "md:border-l md:border-line", i >= 2 && "border-t border-line md:border-t-0")}>
            <dt className="text-sm text-white/55">{s.label}</dt>
            <dd className={cn("mt-3 font-display font-bold text-white", s.small ? "text-2xl" : "text-4xl")}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* ── Your next session ────────────────────────────────────── */}
      <section aria-labelledby="session-title" className="grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
        <h2 id="session-title" className="text-6xl leading-[0.9] md:text-8xl">
          Your next
          <br />
          <span className="text-accent">session.</span>
        </h2>
        <div>
          <LivePlayers />
          <p className="mt-8 max-w-md text-lg text-white/70">Pick up where you left off. Check your whitelist access and head back into the city.</p>
          <div className="mt-8 flex flex-col items-start gap-5">
            <ButtonLink href="/queue" size="lg">
              Enter the city <ArrowUpRight size={16} aria-hidden />
            </ButtonLink>
            {!user.whitelisted && (
              <Link href="/applications/whitelist" className="inline-flex items-center gap-1.5 text-sm text-accent-text hover:text-white">
                New here? Apply for whitelist <ArrowUpRight size={14} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-16">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Whitelist / access card */}
            <article className="plate chamfer-lg relative overflow-hidden">
              <div aria-hidden className="absolute inset-0">
                <Image src={home.playImage} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" unoptimized={home.playImage.endsWith(".svg")} className="object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-700/60 via-ink-700/90 to-ink-700" />
              </div>
              <div className="relative p-7 md:p-9">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-digits text-xs font-semibold uppercase tracking-[0.25em] text-white/55">{site.shortName} / Your next session</p>
                  {ban ? (
                    <Badge tone="red"><ShieldAlert size={13} aria-hidden /> Access blocked</Badge>
                  ) : canPlay ? (
                    <Badge tone="green"><CheckCircle2 size={13} aria-hidden /> Access verified</Badge>
                  ) : (
                    <Badge tone="amber"><Lock size={13} aria-hidden /> No access yet</Badge>
                  )}
                </div>
                <h3 className="mt-4 text-5xl">Whitelist<span className="text-accent">.</span></h3>
                <p className="mt-2 text-white/60">A city worth being part of.</p>
                <div className="my-8 h-px bg-line" />

                {ban ? (
                  <AccessState icon={<ShieldAlert className="text-status-offline" aria-hidden />} title="You're banned." body={`${ban.reason}. ${ban.expiresAt ? `Ends ${formatDate(ban.expiresAt, { dateStyle: "medium", timeStyle: "short" })}.` : "This ban is permanent."}`}>
                    <ButtonLink href="/support">Appeal through support</ButtonLink>
                  </AccessState>
                ) : !user.inGuild ? (
                  <AccessState icon={<UserX className="text-status-checking" aria-hidden />} title="Join the Discord first." body={`Your account isn't in the ${site.shortName} Discord yet.`}>
                    <ButtonLink href={site.discordInvite}>Join the Discord <ArrowUpRight size={16} aria-hidden /></ButtonLink>
                  </AccessState>
                ) : !user.whitelisted ? (
                  <AccessState
                    icon={<Clock className="text-status-checking" aria-hidden />}
                    title={whitelistApp ? "Your application is in." : "Your story starts here."}
                    body={whitelistApp ? "The team is reviewing your whitelist application. We'll DM you on Discord when there's a decision." : "Apply for whitelist to get access to the city."}
                  >
                    {whitelistApp ? (
                      <ButtonLink href={`/profile/applications/${whitelistApp.id}`}>View application</ButtonLink>
                    ) : (
                      <ButtonLink href="/applications/whitelist">Apply for whitelist <ArrowUpRight size={16} aria-hidden /></ButtonLink>
                    )}
                  </AccessState>
                ) : (
                  <AccessState icon={<CheckCircle2 className="text-status-online" aria-hidden />} title="There's room for your story." body="A place is available. Open FiveM and connect when you're ready.">
                    {site.connectTarget ? (
                      <ButtonLink href={connectUrl()}>Connect to FiveM <ArrowUpRight size={16} aria-hidden /></ButtonLink>
                    ) : (
                      <ButtonLink href="/queue">Open the Play page</ButtonLink>
                    )}
                    <CopyConnect target={site.connectTarget} />
                  </AccessState>
                )}
              </div>
            </article>

            {/* Checklist */}
            <article className="plate chamfer-lg p-7 md:p-8">
              <p className="font-digits text-xs font-semibold uppercase tracking-[0.25em] text-white/55">Before you head in</p>
              <h3 className="mt-4 text-3xl">Ready for the city.</h3>
              <ul className="mt-6 divide-y divide-line">
                <CheckRow done icon={<Check size={16} />} title="Your account" sub={user.steamHex ? "Discord and Steam linked" : "Discord linked"} />
                <CheckRow done={canPlay} icon={<ShieldCheck size={16} />} title="Server access" sub={canPlay ? "Whitelist access verified" : ban ? "Blocked by a ban" : "Not whitelisted yet"} />
                <CheckRow href="/rules" icon={<ShieldCheck size={16} />} title="The rules" sub="Start on the same page" />
                <CheckRow href="/guides" icon={<BookOpen size={16} />} title="City guides" sub={`Find your feet in ${site.shortName}`} />
              </ul>
            </article>
          </div>

          {/* Application history */}
          <section id="applications" aria-labelledby="history-title" className="scroll-mt-28">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Every step of your journey</p>
                <h2 id="history-title" className="mt-3 text-4xl md:text-5xl">Application history</h2>
              </div>
              <Link href="/applications" aria-label="Browse applications" className="mt-8 p-2 text-white/50 hover:text-white">
                <ArrowUpRight size={20} />
              </Link>
            </div>
            <div className="mt-6">
              <AppHistory apps={history} />
            </div>
          </section>

          {/* In the city + record */}
          <div className="grid gap-6 md:grid-cols-2">
            <article className="plate p-7">
              <h2 className="text-2xl">In the city</h2>
              <dl className="mt-5 grid grid-cols-2 gap-6">
                <div>
                  <dt className="flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/45"><Clock size={13} aria-hidden /> Playtime</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-white">{formatMinutes(user.playtimeMinutes)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/45"><Gamepad2 size={13} aria-hidden /> Last seen</dt>
                  <dd className="mt-2 text-white">{user.lastSeenInGame ? formatDate(user.lastSeenInGame, { dateStyle: "medium", timeStyle: "short" }) : "Never"}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm text-white/55">
                {characters.length
                  ? `Across ${characters.length} character${characters.length === 1 ? "" : "s"}.`
                  : "Your account totals start counting the first time you join."}{" "}
                <a href="#characters" className="text-accent-text hover:text-white">See your characters ↓</a>
              </p>
            </article>

            <article className="plate p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-2xl">Your record</h2>
                <p className="font-mono text-sm text-white/60">{points} pts</p>
              </div>
              {bans.length + warnings.length === 0 ? (
                <p className="mt-4 text-white/55">A clean record. Keep it up.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {[...bans.map((b) => ({ ...b, kind: "Ban" as const })), ...warnings.map((w) => ({ ...w, kind: "Warning" as const, expiresAt: null, active: false }))]
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((x) => (
                      <li key={x.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0">
                          <Badge tone={x.kind === "Ban" ? "red" : "amber"}>{x.kind}</Badge>
                          <p className="mt-2 text-white/80 [overflow-wrap:anywhere]">{x.reason}</p>
                        </div>
                        <div className="shrink-0 text-right text-white/50">
                          <p className="font-mono text-white">{x.points} pts</p>
                          <p>{formatDate(x.createdAt)}</p>
                          {x.kind === "Ban" && <p>{x.active ? (x.expiresAt ? `Until ${formatDate(x.expiresAt)}` : "Permanent") : "Lifted"}</p>}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </article>
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <aside className="space-y-10">
          <article id="linked" className="plate scroll-mt-28 p-6">
            <h2 className="flex items-center gap-2.5 text-2xl">
              <Link2 size={20} className="text-accent" aria-hidden /> Linked accounts
            </h2>
            {searchParams.linked && (
              <p role="status" className="mt-4 rounded-xl bg-status-online/10 px-3.5 py-2.5 text-sm text-[#7ee2a8]">
                {searchParams.linked === "steam" ? "Steam" : "Cfx.re"} account linked.
              </p>
            )}
            {searchParams.link_error && (
              <p role="alert" className="mt-4 rounded-xl bg-accent/10 px-3.5 py-2.5 text-sm text-accent-text">
                {LINK_ERRORS[searchParams.link_error] ?? LINK_ERRORS.failed}
              </p>
            )}
            <ul className="mt-5 space-y-3">
              <LinkedRow logo={<DiscordLogo />} name="Discord" detail={user.username} linked />
              <LinkedRow
                logo={<SteamLogo />}
                name="Steam"
                detail={user.steamHex ? (user.steamName ?? user.steamHex) : "Not linked"}
                linked={!!user.steamHex}
                action={<LinkAction provider="steam" linked={!!user.steamHex} name="Steam" />}
              />
              <LinkedRow
                logo={<FiveMLogo />}
                name="Cfx.re / FiveM"
                detail={user.fivemId ? (user.cfxName ?? user.fivemId) : "Not linked"}
                linked={!!user.fivemId}
                action={<LinkAction provider="cfx" linked={!!user.fivemId} name="your Cfx.re account" />}
              />
              <LinkedRow
                logo={<Gamepad2 size={18} className="text-white/70" aria-hidden />}
                name="Rockstar licence"
                detail={user.fivemLicense ? "Connected in game" : "Links when you join the city"}
                linked={!!user.fivemLicense}
              />
            </ul>
          </article>

          <article className="plate p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl">Queue priority</h2>
              <p className="font-display text-4xl font-bold text-white">{priority.total}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-white/50">Base</dt><dd className="text-right font-mono text-white">{priority.base}</dd>
              <dt className="text-white/50">Role{priority.roleLabel ? ` · ${priority.roleLabel}` : ""}</dt><dd className="text-right font-mono text-white">+{priority.role}</dd>
              <dt className="text-white/50">Supporter{tierActive ? ` · ${user.supporterTier!.name}` : ""}</dt><dd className="text-right font-mono text-white">+{priority.supporter}</dd>
              <dt className="text-white/50">Staff</dt><dd className="text-right font-mono text-white">+{priority.staff}</dd>
              <dt className="text-white/50">Bonus</dt><dd className="text-right font-mono text-white">{priority.manual >= 0 ? "+" : ""}{priority.manual}</dd>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-sm text-white/55">
              {tierActive
                ? `${user.supporterTier!.name} supporter${user.supporterUntil ? ` · renews or ends ${formatDate(user.supporterUntil)}` : ""}`
                : <>Not a supporter. <Link href="/#tiers-title" className="text-accent-text hover:text-white">See tiers</Link></>}
            </p>
          </article>

          <nav aria-labelledby="keep-moving">
            <p id="keep-moving" className="eyebrow">Keep moving</p>
            <ul className="mt-4">
              {[
                { href: "/applications", label: "Find an application" },
                { href: "/guides", label: "Get settled in the city" },
                { href: "/support", label: "Talk to the team" },
              ].map((l) => (
                <li key={l.href} className="border-b border-line">
                  <Link href={l.href} className="group flex items-center justify-between py-5 text-white/85 transition-colors hover:text-white">
                    {l.label}
                    <ArrowUpRight size={16} className="text-white/45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                  </Link>
                </li>
              ))}
              {user.access.level && (
                <li className="border-b border-line">
                  <Link href="/admin" className="group flex items-center justify-between py-5 text-white/85 hover:text-white">
                    Staff dashboard
                    <ArrowUpRight size={16} className="text-white/45 group-hover:text-accent" aria-hidden />
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </aside>
      </div>

      <div className="mt-16">
        <AutoRefresh ms={10_000} />
        <CharacterSection characters={characters} activeCitizenIds={activeCharacterIds(snapshot, user.fivemLicense)} />
      </div>

      <section id="settings" aria-label="Profile settings" className="mt-16 scroll-mt-28">
        <ProfileSettings dmNotifications={user.dmNotifications} isProfilePublic={user.isProfilePublic} />
        {user.isProfilePublic && (
          <p className="mt-3 text-sm text-white/50">
            Your public profile: <Link href={`/u/${user.discordId}`} className="text-accent-text hover:text-white">{site.url.replace(/^https?:\/\//, "")}/u/{user.discordId}</Link>
          </p>
        )}
      </section>
    </div>
  );
}

function AccessState({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-start gap-5">
        <HexBadge size={60}>{icon}</HexBadge>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold uppercase text-white md:text-3xl">{title}</p>
          <p className="mt-1.5 text-white/65 [overflow-wrap:anywhere]">{body}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">{children}</div>
    </div>
  );
}

function CheckRow({ icon, title, sub, done, href }: { icon: React.ReactNode; title: string; sub: string; done?: boolean; href?: string }) {
  const body = (
    <>
      <span className={cn("mt-0.5 shrink-0", done === undefined ? "text-white/45" : done ? "text-status-online" : "text-white/30")} aria-hidden>
        {done === false ? <Circle size={16} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-sm text-white/50">{sub}</span>
      </span>
      {href ? (
        <ArrowUpRight size={15} className="shrink-0 text-white/45 group-hover:text-accent" aria-hidden />
      ) : done ? (
        <Check size={16} className="shrink-0 text-status-online" aria-label="Done" />
      ) : (
        <X size={16} className="shrink-0 text-white/30" aria-label="Not done" />
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="group flex items-start gap-4 py-5 transition-colors hover:bg-white/[0.02]">{body}</Link>
      ) : (
        <div className="flex items-start gap-4 py-5">{body}</div>
      )}
    </li>
  );
}

const LINK_ERRORS: Record<string, string> = {
  taken: "That account is already linked to another Dream RP profile. Open a support ticket if it's yours.",
  cancelled: "Linking was cancelled.",
  expired: "That link request expired. Please try again.",
  invalid: "We couldn't verify that account. Please try again.",
  failed: "Something went wrong while linking. Please try again.",
};

function LinkedRow({ logo, name, detail, linked, action }: { logo: React.ReactNode; name: string; detail: string; linked: boolean; action?: React.ReactNode }) {
  return (
    <li className="chamfer chamfer-sm flex items-center gap-3 border border-line bg-ink-800 px-4 py-3.5">
      <span className="chamfer chamfer-sm flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.05]">{logo}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-semibold text-white">
          {name}
          {linked ? <CheckCircle2 size={15} className="shrink-0 text-status-online" aria-label="Connected" /> : <Circle size={15} className="shrink-0 text-white/25" aria-label="Not linked" />}
        </span>
        <span className="block truncate text-sm text-white/50" title={detail}>{detail}</span>
      </span>
      {action}
    </li>
  );
}

function DiscordLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

function SteamLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#c7d5e0" aria-hidden>
      <path d="M12 2a10 10 0 0 0-9.96 9.1l5.36 2.2a2.8 2.8 0 0 1 1.6-.5h.15l2.4-3.46v-.05a3.78 3.78 0 1 1 3.78 3.78h-.09l-3.4 2.43v.13a2.83 2.83 0 0 1-5.6.57L2.4 14.5A10 10 0 1 0 12 2Zm-4.2 15.2-1.23-.5a2.13 2.13 0 1 0 1.16-2.9l1.27.52a1.56 1.56 0 1 1-1.2 2.88Zm9.53-7.83a2.52 2.52 0 1 0-2.52 2.52 2.52 2.52 0 0 0 2.52-2.52Zm-4.4 0a1.89 1.89 0 1 1 1.88 1.9 1.89 1.89 0 0 1-1.88-1.9Z" />
    </svg>
  );
}

function FiveMLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M9.5 3h5l6 18h-4.2L12 8.6 7.7 21H3.5z" fill="#F40552" />
      <path d="M14.5 3h3L21 13.5z" fill="#F8A33A" />
    </svg>
  );
}
