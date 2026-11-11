import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { can } from "@/lib/permissions";
import { formatAnswer, parseQuestions, toSteps, type Answers } from "@/lib/questions";
import type { HistoryEntry, InternalNote } from "@/lib/applications";
import { STATUS_LABEL } from "@/lib/status-machine";
import { daysBetween, discordAvatarUrl, formatDate } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/misc";
import { StatusChip } from "@/components/ui/status-chip";
import { ReviewActions } from "@/components/admin/review-actions";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const staff = await requireStaffPage("apps.review");
  const app = await db.application.findUnique({
    where: { id: params.id },
    include: { type: true, user: true, reviewer: { select: { username: true } } },
  });
  if (!app) notFound();
  if (!can(staff.access, "apps.review", { department: app.type.department })) redirect("/admin/applications");

  const [previous, bans, warnings] = await Promise.all([
    db.application.findMany({ where: { userId: app.userId, id: { not: app.id } }, include: { type: { select: { title: true } } }, orderBy: { submittedAt: "desc" } }),
    db.ban.findMany({ where: { userId: app.userId }, orderBy: { createdAt: "desc" } }),
    db.warning.findMany({ where: { userId: app.userId }, orderBy: { createdAt: "desc" } }),
  ]);
  const answers = app.answers as Answers;
  const steps = toSteps(parseQuestions(app.type.questions));
  const notes = (app.internalNotes as unknown as InternalNote[]) ?? [];
  const history = (app.history as unknown as HistoryEntry[]) ?? [];
  const u = app.user;
  const points = [...bans, ...warnings].reduce((n, x) => n + x.points, 0);

  return (
    <div>
      <Link href="/admin/applications" className="inline-flex items-center gap-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/50 hover:text-white">
        <ArrowLeft size={14} aria-hidden /> Applications
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{app.reference}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{app.type.title}</h1>
          <p className="mt-1 text-white/50">
            Submitted {formatDate(app.submittedAt, { dateStyle: "medium", timeStyle: "short" })}
            {app.reviewer && ` · Claimed by ${app.reviewer.username}`}
          </p>
        </div>
        <StatusChip status={app.status} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {steps.map((s, i) => (
            <Card key={s.title + i}>
              <h2 className="text-2xl">{s.title}</h2>
              <dl className="mt-5 space-y-5">
                {s.questions.map((q) => (
                  <div key={q.id}>
                    <dt className="text-sm font-semibold text-white/85">{q.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-white/70">{formatAnswer(q, answers[q.id])}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}

          <Card>
            <h2 className="text-2xl">Internal notes</h2>
            {notes.length ? (
              <ul className="mt-4 space-y-4">
                {notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-accent/40 pl-4">
                    <p className="whitespace-pre-wrap text-white/80 [overflow-wrap:anywhere]">{n.text}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {n.byName} · {formatDate(n.at, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-white/50">No notes yet. Notes are only visible to staff.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl">Audit trail</h2>
            <ol className="mt-4 space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex flex-wrap gap-x-2 text-white/70">
                  <span className="font-mono text-xs text-white/40">{formatDate(h.at, { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="text-white">{h.byName ?? "System"}</span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {h.action === "status" && h.to ? `moved to ${STATUS_LABEL[h.to]}` : h.action}
                    {h.note ? `: “${h.note}”` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="order-first min-w-0 space-y-6 xl:order-none xl:sticky xl:top-28 xl:self-start">
          <ReviewActions
            id={app.id}
            status={app.status}
            claimedByMe={app.reviewerId === staff.id}
            claimedBy={app.reviewer?.username ?? null}
          />
          <Card className="!p-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={discordAvatarUrl(u.discordId, u.avatar)} alt="" width={44} height={44} className="chamfer chamfer-sm h-11 w-11" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{u.globalName || u.username}</p>
                <p className="font-mono text-xs text-white/40">{u.discordId}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-white/50">Discord account</dt><dd className="text-white">{daysBetween(u.discordCreatedAt, new Date())} days old</dd></div>
              <div className="flex justify-between"><dt className="text-white/50">Joined guild</dt><dd className="text-white">{u.guildJoinedAt ? formatDate(u.guildJoinedAt) : u.inGuild ? "Yes" : "Not in guild"}</dd></div>
              <div className="flex justify-between"><dt className="text-white/50">Whitelisted</dt><dd className="text-white">{u.whitelisted ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-white/50">Punishment points</dt><dd className="font-mono text-white">{points}</dd></div>
            </dl>
            {can(staff.access, "users.view") && (
              <Link href={`/admin/users/${u.id}`} className="mt-4 inline-block text-sm text-accent-text hover:text-white">
                Open user →
              </Link>
            )}
          </Card>
          <Card className="!p-6">
            <h3 className="text-xl">Previous applications</h3>
            {previous.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {previous.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/applications/${p.id}`} className="truncate text-white/80 hover:text-white">
                      {p.type.title} · {formatDate(p.submittedAt)}
                    </Link>
                    <StatusChip status={p.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-white/50">None.</p>
            )}
          </Card>
          <Card className="!p-6">
            <h3 className="text-xl">Bans &amp; warnings</h3>
            {bans.length + warnings.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {bans.map((b) => (
                  <li key={b.id}>
                    <Badge tone="red">Ban{b.active ? "" : " (lifted)"}</Badge> <span className="text-white/70">{b.reason}</span>
                  </li>
                ))}
                {warnings.map((w) => (
                  <li key={w.id}>
                    <Badge tone="amber">{w.points} pts</Badge> <span className="text-white/70">{w.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-white/50">Clean record.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
