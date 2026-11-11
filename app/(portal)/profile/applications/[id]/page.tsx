import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatAnswer, parseQuestions, toSteps, type Answers } from "@/lib/questions";
import { isOpenStatus } from "@/lib/status-machine";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/misc";
import { StatusChip } from "@/components/ui/status-chip";
import { WithdrawButton } from "@/components/profile/withdraw-button";

export const metadata: Metadata = { title: "Application", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = ["PENDING", "UNDER_REVIEW", "INTERVIEW", "DECIDED"] as const;

export default async function MyApplicationPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=/profile/applications/${params.id}`);
  const app = await db.application.findUnique({ where: { id: params.id }, include: { type: true } });
  if (!app || app.userId !== user.id) notFound();

  const answers = app.answers as Answers;
  const steps = toSteps(parseQuestions(app.type.questions));
  const reached = app.status === "ACCEPTED" || app.status === "DENIED" ? 3 : app.status === "INTERVIEW" ? 2 : app.status === "UNDER_REVIEW" ? 1 : 0;
  const cooldownEnds = app.status === "DENIED" && app.decidedAt && app.type.cooldownDays ? new Date(app.decidedAt.getTime() + app.type.cooldownDays * 86_400_000) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/profile#applications" className="inline-flex items-center gap-2 font-digits text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white">
        <ArrowLeft size={14} aria-hidden /> My applications
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{app.reference}</p>
          <h1 className="mt-2 text-5xl">{app.type.title}</h1>
          <p className="mt-2 text-white/50">Submitted {formatDate(app.submittedAt, { dateStyle: "long", timeStyle: "short" })}</p>
        </div>
        <StatusChip status={app.status} />
      </div>

      {app.status !== "WITHDRAWN" && (
        <ol className="mt-10 grid grid-cols-4 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={i <= reached ? "glow-line h-1" : "h-1 bg-white/10"} />
              <p className={`mt-2 font-digits text-[11px] font-bold uppercase tracking-[0.15em] ${i <= reached ? "text-white" : "text-white/35"}`}>
                {s === "DECIDED" ? "Decision" : s === "UNDER_REVIEW" ? "In review" : s === "INTERVIEW" ? "Interview" : "Submitted"}
              </p>
            </li>
          ))}
        </ol>
      )}

      {app.status === "INTERVIEW" && (
        <Card className="mt-8 border-accent/30">
          <p className="flex items-center gap-3 text-white">
            <CalendarClock className="text-accent" aria-hidden />
            {app.interviewAt
              ? `Interview scheduled for ${formatDate(app.interviewAt, { dateStyle: "full", timeStyle: "short" })}.`
              : "You've been invited to an interview. Staff will contact you on Discord."}
          </p>
        </Card>
      )}

      {(app.status === "ACCEPTED" || app.status === "DENIED") && (
        <Card className="mt-8">
          <h2 className="text-2xl">{app.status === "ACCEPTED" ? "Accepted." : "Not accepted this time."}</h2>
          {app.decisionReason && <p className="mt-3 whitespace-pre-wrap text-white/70 [overflow-wrap:anywhere]">{app.decisionReason}</p>}
          {app.status === "ACCEPTED" && app.type.grantsWhitelist && (
            <Link href="/queue" className="mt-4 inline-block text-accent-text underline underline-offset-4">
              Head to the Play page to connect →
            </Link>
          )}
          {cooldownEnds && <p className="mt-3 text-sm text-white/50">You can apply again after {formatDate(cooldownEnds, { dateStyle: "long" })}.</p>}
          {app.decidedAt && <p className="mt-2 text-sm text-white/40">Decided {formatDate(app.decidedAt)}</p>}
        </Card>
      )}

      <div className="mt-10 space-y-6">
        {steps.map((s, i) => (
          <Card key={s.title + i}>
            <h2 className="text-2xl">{s.title}</h2>
            <dl className="mt-5 space-y-5">
              {s.questions.map((q) => (
                <div key={q.id}>
                  <dt className="text-sm font-semibold text-white/85">{q.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-white/60">{formatAnswer(q, answers[q.id])}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      {isOpenStatus(app.status) && (
        <div className="mt-10 flex justify-end">
          <WithdrawButton id={app.id} />
        </div>
      )}
    </div>
  );
}
