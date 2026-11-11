"use client";
import type { AnswerValue, Question } from "@/lib/questions";
import { cn } from "@/lib/utils";

interface FieldProps {
  q: Question;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (v: AnswerValue) => void;
}

const choice =
  "chamfer chamfer-sm flex cursor-pointer items-center gap-3 border border-white/10 bg-ink-800 px-4 py-3 text-white/80 transition-colors hover:border-white/25 has-[:checked]:border-accent/70 has-[:checked]:bg-accent/10 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent";

export function Field({ q, value, error, onChange }: FieldProps) {
  const id = `q-${q.id}`;
  const helpId = q.help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": !!error, "aria-describedby": describedBy, "aria-required": q.required };

  const label = (
    <span className="label !text-[13px] !normal-case !tracking-normal !font-sans !font-semibold !text-white">
      {q.label} {q.required && q.type !== "agree_rules" && <span className="text-accent" aria-hidden>*</span>}
    </span>
  );

  let control: React.ReactNode;
  switch (q.type) {
    case "short_text":
    case "url":
      control = (
        <input
          {...common}
          type={q.type === "url" ? "url" : "text"}
          className="input"
          value={(value as string) ?? ""}
          maxLength={q.maxLength}
          placeholder={q.placeholder ?? (q.type === "url" ? "https://" : undefined)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "long_text": {
      const len = ((value as string) ?? "").trim().length;
      control = (
        <>
          <textarea
            {...common}
            className="input min-h-[160px] resize-y leading-relaxed"
            value={(value as string) ?? ""}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className={cn("mt-1.5 text-right font-digits text-xs tracking-wider", q.minLength && len < q.minLength ? "text-white/40" : "text-status-online/80")} aria-live="polite">
            {len}
            {q.maxLength ? ` / ${q.maxLength}` : ""} characters{q.minLength && len < q.minLength ? ` (min ${q.minLength})` : ""}
          </p>
        </>
      );
      break;
    }
    case "number":
      control = (
        <input
          {...common}
          type="number"
          inputMode="numeric"
          className="input max-w-[200px]"
          value={value === null || value === undefined ? "" : String(value)}
          min={q.min}
          max={q.max}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
      break;
    case "date":
      control = <input {...common} type="date" className="input max-w-[240px]" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "select":
      control = (
        <select {...common} className="input" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {q.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case "radio":
    case "yes_no": {
      const opts = q.type === "yes_no" ? [{ v: "yes", l: "Yes" }, { v: "no", l: "No" }] : (q.options ?? []).map((o) => ({ v: o, l: o }));
      return (
        <fieldset aria-describedby={describedBy} aria-invalid={!!error}>
          <legend>{label}</legend>
          {q.help && <p id={helpId} className="-mt-0.5 mb-3 text-sm text-white/50">{q.help}</p>}
          <div className={cn("grid gap-2", q.type === "yes_no" ? "grid-cols-2 max-w-sm" : "sm:grid-cols-2")}>
            {opts.map((o) => (
              <label key={o.v} className={choice}>
                <input type="radio" name={id} className="sr-only" checked={value === o.v} onChange={() => onChange(o.v)} />
                <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-white/30 [label:has(:checked)_&]:border-accent">
                  <span className="h-2 w-2 bg-accent opacity-0 [label:has(:checked)_&]:opacity-100" />
                </span>
                {o.l}
              </label>
            ))}
          </div>
          {error && <p id={errId} role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
        </fieldset>
      );
    }
    case "multi_select": {
      const arr = Array.isArray(value) ? value : [];
      return (
        <fieldset aria-describedby={describedBy} aria-invalid={!!error}>
          <legend>{label}</legend>
          {q.help && <p id={helpId} className="-mt-0.5 mb-3 text-sm text-white/50">{q.help}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options?.map((o) => (
              <label key={o} className={choice}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={arr.includes(o)}
                  onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))}
                />
                <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-white/30 text-[10px] text-white [label:has(:checked)_&]:border-accent [label:has(:checked)_&]:bg-accent">
                  {arr.includes(o) ? "✓" : ""}
                </span>
                {o}
              </label>
            ))}
          </div>
          {error && <p id={errId} role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
        </fieldset>
      );
    }
    case "checkbox":
    case "agree_rules":
      return (
        <div>
          <label className={cn(choice, "items-start")}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--accent-rgb))]"
              checked={value === true}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>
              {q.type === "agree_rules" ? (
                <>
                  {q.label}{" "}
                  <a href="/rules" target="_blank" className="text-accent-text underline underline-offset-4">
                    Read the rules
                  </a>
                </>
              ) : (
                q.label
              )}
            </span>
          </label>
          {q.help && <p id={helpId} className="mt-2 text-sm text-white/50">{q.help}</p>}
          {error && <p id={errId} role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
        </div>
      );
  }

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {q.help && <p id={helpId} className="-mt-0.5 mb-2 text-sm text-white/50">{q.help}</p>}
      {control}
      {error && <p id={errId} role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
    </div>
  );
}
