"use client";
import { HexBadge } from "@/components/ui/hexagon";
import { useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, Download, ExternalLink, RefreshCw, ShieldAlert, UserX, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { useMe } from "@/components/use-me";
import { connectUrl, site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = {
  PENDING: "Your whitelist application is waiting for review.",
  UNDER_REVIEW: "Your whitelist application is being reviewed.",
  INTERVIEW: "You've been invited to an interview. Check your Discord DMs.",
  DENIED: "Your last whitelist application wasn't accepted.",
};

function Shell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="plate chamfer-lg p-6 md:p-10">
      <div className="flex items-start gap-5">
        <HexBadge size={60}>{icon}</HexBadge>
        <div className="min-w-0 flex-1">
          <h3 className="text-3xl md:text-4xl">{title}</h3>
          <div className="mt-3 text-white/65">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AccessCard() {
  const { me, loading, refresh } = useMe();
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const recheck = async () => {
    setChecking(true);
    await refresh(true);
    setChecking(false);
  };
  const recheckBtn = (
    <Button variant="secondary" onClick={recheck} disabled={checking}>
      <RefreshCw size={15} className={checking ? "animate-spin" : ""} aria-hidden /> Re-check
    </Button>
  );

  if (loading)
    return (
      <div className="plate chamfer-lg space-y-4 p-6 md:p-10" role="status" aria-label="Checking your access">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-12 w-48" />
      </div>
    );

  if (!me)
    return (
      <Shell icon={<Users className="text-accent" aria-hidden />} title="Your story is waiting.">
        <p>Sign in with Discord to check your whitelist access and join the city.</p>
        <div className="mt-6">
          <ButtonLink href="/signin?callbackUrl=/queue" size="lg">Sign in with Discord</ButtonLink>
        </div>
      </Shell>
    );

  if (me.ban)
    return (
      <Shell icon={<ShieldAlert className="text-status-offline" aria-hidden />} title="You're banned.">
        <p><strong className="text-white">Reason:</strong> {me.ban.reason}</p>
        <p className="mt-1">{me.ban.expiresAt ? `Expires ${formatDate(me.ban.expiresAt, { dateStyle: "long", timeStyle: "short" })}.` : "This ban is permanent."}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/support">Appeal through support</ButtonLink>
        </div>
      </Shell>
    );

  if (!me.inGuild)
    return (
      <Shell icon={<UserX className="text-status-checking" aria-hidden />} title="Join the Discord first.">
        <p>Your account isn&apos;t in the {site.shortName} Discord server. Join it, then check again.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={site.discordInvite}>Join the Discord</ButtonLink>
          {recheckBtn}
        </div>
      </Shell>
    );

  if (!me.whitelisted) {
    const app = me.pendingWhitelistApp;
    return (
      <Shell icon={<UserX className="text-accent" aria-hidden />} title="You're not whitelisted yet.">
        <p>{app ? STATUS_TEXT[app.status] : "Apply for whitelist to join the city. Most applications are answered within a few days."}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {app && app.status !== "DENIED" ? (
            <ButtonLink href={`/profile/applications/${app.id}`}>View application {app.reference}</ButtonLink>
          ) : (
            <ButtonLink href="/applications/whitelist">Apply for whitelist</ButtonLink>
          )}
          {recheckBtn}
        </div>
      </Shell>
    );
  }

  const target = site.connectTarget;
  const cmd = target ? `connect ${target}` : "";
  return (
    <div className="plate chamfer-lg relative overflow-hidden p-6 md:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-status-online/10 blur-3xl" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <span className="chamfer chamfer-sm flex h-14 w-14 shrink-0 items-center justify-center bg-status-online/10 ring-1 ring-inset ring-status-online/30">
            <CheckCircle2 className="text-status-online" aria-hidden />
          </span>
          <div>
            <h3 className="text-3xl md:text-4xl">You&apos;re whitelisted.</h3>
            <p className="mt-2 text-white/65">A place is waiting. Open FiveM and connect when you&apos;re ready.</p>
            {me.queue && (
              <p className="mt-3 font-digits text-lg font-semibold text-white">
                You&apos;re <span className="text-accent">#{me.queue.position}</span> of {me.queue.length} in the queue.
              </p>
            )}
          </div>
        </div>
        <dl className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="col-span-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Queue priority</dt>
          <dd className="col-span-2 font-display text-5xl font-bold text-white">{me.priority.total}</dd>
          <dt className="text-white/50">Base</dt><dd className="text-right font-mono text-white">{me.priority.base}</dd>
          <dt className="text-white/50">Supporter{me.tier ? ` (${me.tier.name})` : ""}</dt><dd className="text-right font-mono text-white">+{me.priority.supporter}</dd>
          <dt className="text-white/50">Staff</dt><dd className="text-right font-mono text-white">+{me.priority.staff}</dd>
          <dt className="text-white/50">Bonus</dt><dd className="text-right font-mono text-white">{me.priority.manual >= 0 ? "+" : ""}{me.priority.manual}</dd>
        </dl>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center gap-3">
        {target ? (
          <ButtonLink href={connectUrl()} size="lg">
            Connect to FiveM <ExternalLink size={16} aria-hidden />
          </ButtonLink>
        ) : (
          <p className="text-sm text-white/50">The connect address hasn&apos;t been set yet. Ask staff in Discord.</p>
        )}
        <ButtonLink href={site.fivemDownload} variant="ghost">
          <Download size={16} aria-hidden /> Get FiveM
        </ButtonLink>
      </div>
      {cmd && (
        <div className="relative mt-5 flex max-w-xl items-center gap-2">
          <code className="chamfer chamfer-sm flex-1 truncate bg-ink-800 px-4 py-3 font-mono text-sm text-white ring-1 ring-inset ring-white/10">{cmd}</code>
          <Button
            variant="secondary"
            aria-label="Copy connect command"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(cmd);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {}
            }}
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      )}
      {cmd && <p className="relative mt-2 text-xs text-white/40">Press F8 in FiveM and paste the command.</p>}
      {!me.license && <p className="relative mt-4 text-xs text-white/40">Your FiveM licence links automatically the first time you connect. <Link href="/profile" className="underline">See your profile</Link>.</p>}
    </div>
  );
}
