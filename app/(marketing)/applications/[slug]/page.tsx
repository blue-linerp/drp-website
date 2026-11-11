import { HexIcon } from "@/components/ui/hexagon";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { eligibilityFor } from "@/lib/applications";
import { parseQuestions, type Answers } from "@/lib/questions";
import { ApplicationForm } from "@/components/apps/application-form";
import { GateNotice } from "@/components/apps/gate-notice";
import { AppIcon } from "@/components/apps/icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const type = await db.applicationType.findUnique({ where: { slug: params.slug }, select: { title: true } });
  return { title: type ? `${type.title} application` : "Application", robots: { index: false } };
}

export default async function ApplicationFormPage({ params }: { params: { slug: string } }) {
  const type = await db.applicationType.findUnique({ where: { slug: params.slug } });
  if (!type) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(`/applications/${type.slug}`)}`);

  const gate = await eligibilityFor(user, type);
  const draft = gate.ok
    ? await db.applicationDraft.findUnique({ where: { userId_typeId: { userId: user.id, typeId: type.id } } })
    : null;

  return (
    <div className="container max-w-3xl pb-24 pt-28 md:pt-36">
      <Link href="/applications" className="inline-flex items-center gap-2 font-digits text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white">
        <ArrowLeft size={14} aria-hidden /> All applications
      </Link>
      <div className="mt-8 flex items-center gap-4">
        <HexIcon size={72}>
          <AppIcon name={type.icon} size={26} />
        </HexIcon>
        <div>
          <p className="eyebrow">Application</p>
          <h1 className="mt-1 text-5xl md:text-6xl">{type.title}</h1>
        </div>
      </div>
      <p className="mt-5 text-lg text-white/65">{type.description}</p>

      <div role="note" className="chamfer chamfer-sm mt-8 flex items-center gap-3 border-l-2 border-accent bg-accent/10 px-5 py-4 text-sm text-white">
        <Bot size={18} className="shrink-0 text-accent" aria-hidden />
        <strong className="font-semibold">The use of AI to write applications is prohibited.</strong>
      </div>

      <div className="mt-10">
        {gate.ok ? (
          <ApplicationForm
            typeSlug={type.slug}
            typeTitle={type.title}
            questions={parseQuestions(type.questions)}
            initialAnswers={(draft?.answers as Answers) ?? null}
            initialStep={draft?.step ?? 0}
            draftSavedAt={draft?.updatedAt.toISOString() ?? null}
          />
        ) : (
          <GateNotice gate={JSON.parse(JSON.stringify(gate))} />
        )}
      </div>
    </div>
  );
}
