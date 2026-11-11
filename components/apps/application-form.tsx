"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Pencil } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatAnswer, toSteps, validateAnswer, type AnswerValue, type Answers, type Question } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Field } from "./fields";

interface Props {
  typeSlug: string;
  typeTitle: string;
  questions: Question[];
  initialAnswers: Answers | null;
  initialStep: number;
  draftSavedAt: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ApplicationForm({ typeSlug, typeTitle, questions, initialAnswers, initialStep, draftSavedAt }: Props) {
  const steps = useMemo(() => toSteps(questions), [questions]);
  const reviewIndex = steps.length;
  const lsKey = `drp-app-draft-${typeSlug}`;

  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  const [step, setStep] = useState(Math.min(initialStep, reviewIndex));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>(draftSavedAt ? "saved" : "idle");
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; reference: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Restore a newer local draft (e.g. typed while offline) over the server draft.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return;
      const local = JSON.parse(raw) as { answers: Answers; step: number; at: number };
      if (!draftSavedAt || local.at > Date.parse(draftSavedAt)) {
        setAnswers(local.answers);
        setStep(Math.min(local.step, reviewIndex));
      }
    } catch {}
  }, [lsKey, draftSavedAt, reviewIndex]);

  const persist = useCallback(
    async (a: Answers, s: number) => {
      try {
        localStorage.setItem(lsKey, JSON.stringify({ answers: a, step: s, at: Date.now() }));
      } catch {}
      setSave("saving");
      try {
        const r = await fetch(`/api/applications/drafts/${typeSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: a, step: s }),
        });
        if (!r.ok) throw new Error();
        setSave("saved");
        setDirty(false);
      } catch {
        setSave("error");
      }
    },
    [lsKey, typeSlug],
  );

  // Debounced autosave.
  useEffect(() => {
    if (!dirty || done) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(answers, step), 1200);
    return () => clearTimeout(timer.current);
  }, [answers, step, dirty, done, persist]);

  // Warn about unsaved changes when leaving.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !done) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, done]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const setAnswer = (id: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setDirty(true);
    if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest);
  };

  const validateStep = (i: number) => {
    const errs: Record<string, string> = {};
    for (const q of steps[i].questions) {
      const e = validateAnswer(q, answers[q.id]);
      if (e) errs[q.id] = e;
    }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(`q-${first}`)?.focus();
    return !first;
  };

  const goTo = (i: number) => {
    setStep(i);
    setDirty(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (step < reviewIndex && !validateStep(step)) return;
    goTo(step + 1);
  };

  const submit = async () => {
    for (let i = 0; i < steps.length; i++) {
      const bad = steps[i].questions.find((q) => validateAnswer(q, answers[q.id]));
      if (bad) {
        goTo(i);
        setTimeout(() => validateStep(i), 50);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeSlug, answers }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j.fieldErrors) setErrors(j.fieldErrors);
        throw new Error(j.error || "Couldn't submit your application.");
      }
      clearTimeout(timer.current);
      try {
        localStorage.removeItem(lsKey);
      } catch {}
      setDirty(false);
      setDone(j);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done)
    return (
      <div className="plate chamfer-lg p-8 text-center md:p-12" role="status">
        <CheckCircle2 size={48} className="mx-auto text-status-online" aria-hidden />
        <h2 className="mt-6 text-5xl">Application sent.</h2>
        <p className="mx-auto mt-4 max-w-md text-white/65">
          Thanks for applying for {typeTitle}. The team will review it soon, and we&apos;ll message you on Discord when there&apos;s a decision.
        </p>
        <p className="mt-6 font-digits text-sm uppercase tracking-[0.2em] text-white/50">Reference</p>
        <p className="mt-1 font-digits text-3xl font-bold tracking-[0.15em] text-white">{done.reference}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/profile/applications/${done.id}`}>View status</ButtonLink>
          <ButtonLink href="/rules" variant="secondary">
            Read the rules
          </ButtonLink>
        </div>
      </div>
    );

  const total = steps.length + 1;
  const pct = Math.round(((step + 1) / total) * 100);

  return (
    <div>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between font-digits text-xs font-bold uppercase tracking-[0.2em] text-white/50">
          <span>
            Step {step + 1} of {total}
          </span>
          <span aria-live="polite">
            {save === "saving" ? "Saving…" : save === "saved" ? "Draft saved" : save === "error" ? "Saved on this device" : ""}
          </span>
        </div>
        <div className="mt-3 h-1 bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Application progress">
          <div className="glow-line h-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-4 hidden flex-wrap gap-x-6 gap-y-2 md:flex">
          {[...steps.map((s) => s.title), "Review"].map((t, i) => (
            <li key={t + i} className={cn("font-digits text-xs uppercase tracking-[0.15em]", i === step ? "text-white" : i < step ? "text-white/60" : "text-white/30")}>
              <span className="text-accent">{String(i + 1).padStart(2, "0")}</span> {t}
            </li>
          ))}
        </ol>
      </div>

      <div className="plate chamfer-lg p-6 md:p-10">
        {step < reviewIndex ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <h2 ref={headingRef} tabIndex={-1} className="text-3xl focus:outline-none md:text-4xl">
              {steps[step].title}
            </h2>
            <div className="mt-8 space-y-8">
              {steps[step].questions.map((q) => (
                <Field key={q.id} q={q} value={answers[q.id]} error={errors[q.id]} onChange={(v) => setAnswer(q.id, v)} />
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => goTo(step - 1)}>
                  <ArrowLeft size={16} aria-hidden /> Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">
                {step === steps.length - 1 ? "Review answers" : "Continue"} <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-3xl focus:outline-none md:text-4xl">
              Review your answers.
            </h2>
            <p className="mt-3 text-white/60">Check everything before you send it. You can&apos;t edit an application after submitting.</p>
            <div className="mt-8 space-y-8">
              {steps.map((s, i) => (
                <section key={s.title + i} aria-labelledby={`review-${i}`}>
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 id={`review-${i}`} className="text-xl">
                      {s.title}
                    </h3>
                    <button type="button" onClick={() => goTo(i)} className="inline-flex items-center gap-1.5 text-sm text-accent-text hover:text-white">
                      <Pencil size={14} aria-hidden /> Edit
                    </button>
                  </div>
                  <dl className="mt-4 space-y-4">
                    {s.questions.map((q) => (
                      <div key={q.id}>
                        <dt className="text-sm font-semibold text-white/80">{q.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-white/60">{formatAnswer(q, answers[q.id])}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            {submitError && (
              <p role="alert" className="mt-8 bg-accent/10 px-4 py-3 text-sm text-accent-text">
                {submitError}
              </p>
            )}
            <div className="mt-10 flex flex-wrap justify-between gap-3">
              <Button variant="ghost" onClick={() => goTo(step - 1)}>
                <ArrowLeft size={16} aria-hidden /> Back
              </Button>
              <Button onClick={submit} disabled={submitting} size="lg">
                {submitting ? "Sending…" : "Submit application"} <Check size={16} aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-white/40">
        Your progress saves automatically. Need help? <Link href="/support" className="underline hover:text-white">Talk to the team</Link>.
      </p>
    </div>
  );
}
