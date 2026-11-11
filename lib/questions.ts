import { z } from "zod";

/** Application form definitions, shared by the builder, the form, and server validation. */
export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "number",
  "select",
  "multi_select",
  "radio",
  "checkbox",
  "date",
  "url",
  "yes_no",
  "agree_rules",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  number: "Number",
  select: "Dropdown",
  multi_select: "Multi-select",
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
  yes_no: "Yes / No",
  agree_rules: "I agree to the rules",
};

export const questionSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, - or _"),
  type: z.enum(QUESTION_TYPES),
  label: z.string().min(1).max(300),
  help: z.string().max(600).optional(),
  section: z.string().max(80).optional(),
  required: z.boolean().default(true),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().max(300).optional(),
  patternMessage: z.string().max(200).optional(),
  options: z.array(z.string().min(1).max(200)).optional(),
  placeholder: z.string().max(200).optional(),
});
export type Question = z.infer<typeof questionSchema>;
export const questionsSchema = z.array(questionSchema).max(100).superRefine((qs, ctx) => {
  const seen = new Set<string>();
  qs.forEach((q, i) => {
    if (seen.has(q.id)) ctx.addIssue({ code: "custom", message: `Duplicate question id "${q.id}"`, path: [i, "id"] });
    seen.add(q.id);
    if (["select", "multi_select", "radio"].includes(q.type) && !(q.options && q.options.length))
      ctx.addIssue({ code: "custom", message: `"${q.label}" needs at least one option`, path: [i, "options"] });
    if (q.pattern) {
      try {
        new RegExp(q.pattern);
      } catch {
        ctx.addIssue({ code: "custom", message: `Invalid regex on "${q.label}"`, path: [i, "pattern"] });
      }
    }
  });
});

export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

export function parseQuestions(json: unknown): Question[] {
  const r = questionsSchema.safeParse(json);
  return r.success ? r.data : [];
}

/** Group questions into form steps by their `section` (consecutive runs). */
export function toSteps(questions: Question[]): { title: string; questions: Question[] }[] {
  const steps: { title: string; questions: Question[] }[] = [];
  for (const q of questions) {
    const title = q.section || "Questions";
    const last = steps[steps.length - 1];
    if (last && last.title === title) last.questions.push(q);
    else steps.push({ title, questions: [q] });
  }
  return steps;
}

function isEmpty(v: AnswerValue | undefined) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Returns an error message, or null when the answer is valid. */
export function validateAnswer(q: Question, v: AnswerValue | undefined): string | null {
  if (q.type === "agree_rules") return v === true ? null : "You must agree to the rules to continue.";
  if (q.type === "checkbox") return q.required && v !== true ? "This box must be checked." : null;
  if (isEmpty(v)) return q.required ? "This field is required." : null;

  switch (q.type) {
    case "short_text":
    case "long_text":
    case "url": {
      if (typeof v !== "string") return "Enter text.";
      const len = v.trim().length;
      if (q.minLength && len < q.minLength) return `Write at least ${q.minLength} characters (${len} so far).`;
      if (q.maxLength && v.length > q.maxLength) return `Keep it under ${q.maxLength} characters.`;
      if (q.type === "url") {
        try {
          const u = new URL(v);
          if (!/^https?:$/.test(u.protocol)) return "Enter a link starting with http:// or https://.";
        } catch {
          return "Enter a valid link.";
        }
      }
      if (q.pattern && !new RegExp(q.pattern).test(v)) return q.patternMessage || "This doesn't match the expected format.";
      return null;
    }
    case "number": {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return "Enter a number.";
      if (q.min !== undefined && n < q.min) return `Must be at least ${q.min}.`;
      if (q.max !== undefined && n > q.max) return `Must be at most ${q.max}.`;
      return null;
    }
    case "date": {
      if (typeof v !== "string" || Number.isNaN(Date.parse(v))) return "Enter a valid date.";
      return null;
    }
    case "select":
    case "radio":
      return typeof v === "string" && q.options?.includes(v) ? null : "Choose one of the options.";
    case "multi_select": {
      if (!Array.isArray(v) || !v.every((x) => q.options?.includes(x))) return "Choose from the options.";
      if (q.min !== undefined && v.length < q.min) return `Choose at least ${q.min}.`;
      if (q.max !== undefined && v.length > q.max) return `Choose at most ${q.max}.`;
      return null;
    }
    case "yes_no":
      return v === "yes" || v === "no" ? null : "Choose yes or no.";
  }
  return null;
}

export function validateAnswers(questions: Question[], answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const err = validateAnswer(q, answers[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}

/** Drop unknown keys and coerce types so only declared answers are stored. */
export function cleanAnswers(questions: Question[], answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined) continue;
    if (q.type === "number" && v !== null && v !== "") out[q.id] = Number(v);
    else if (typeof v === "string") out[q.id] = v.slice(0, q.maxLength ?? 10_000);
    else out[q.id] = v;
  }
  return out;
}

export function formatAnswer(q: Question, v: AnswerValue | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (q.type === "yes_no") return v === "yes" ? "Yes" : "No";
  return String(v);
}

export const answersSchema = z.record(
  z.string().max(64),
  z.union([z.string().max(10_000), z.number(), z.boolean(), z.array(z.string().max(200)).max(50), z.null()]),
);
