"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { APP_ICONS, AppIcon } from "@/components/apps/icon";
import { QUESTION_TYPES, QUESTION_TYPE_LABEL, type Question, type QuestionType } from "@/lib/questions";
import { APPLICATION_TEMPLATES, type ApplicationTemplate } from "@/lib/application-templates";
import { cn, slugify } from "@/lib/utils";
import { SortableList } from "./sortable";
import { useAction } from "./use-action";

export interface TypeForm {
  id?: string;
  slug: string;
  title: string;
  category: "WHITELIST" | "DEPARTMENT" | "STAFF" | "SPECIAL";
  department: string;
  description: string;
  icon: string;
  isOpen: boolean;
  /** ISO from the server; converted to datetime-local on mount. */
  opensAt: string;
  closesAt: string;
  minAge: string;
  minDiscordAgeDays: number;
  requiredRoleIds: string;
  requiresWhitelist: boolean;
  grantRoleId: string;
  grantsWhitelist: boolean;
  cooldownDays: number;
  webhookUrl: string;
  questions: Question[];
}

type Q = Question & { _key: string };
const withKey = (q: Question): Q => ({ ...q, _key: crypto.randomUUID() });
const isoToLocal = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const HAS_OPTIONS: QuestionType[] = ["select", "multi_select", "radio"];
const HAS_LENGTH: QuestionType[] = ["short_text", "long_text", "url"];
const HAS_RANGE: QuestionType[] = ["number", "multi_select"];

export function TypeEditor({ initial }: { initial: TypeForm }) {
  const router = useRouter();
  const { run, busy, error, ok } = useAction();
  const [f, setF] = useState({ ...initial, opensAt: "", closesAt: "" });
  const [qs, setQs] = useState<Q[]>(() => initial.questions.map(withKey));
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    setF((s) => ({ ...s, opensAt: isoToLocal(initial.opensAt), closesAt: isoToLocal(initial.closesAt) }));
  }, [initial.opensAt, initial.closesAt]);

  const set = <K extends keyof TypeForm>(k: K, v: TypeForm[K]) => setF((s) => ({ ...s, [k]: v }));
  const setQ = (key: string, patch: Partial<Question>) => setQs((list) => list.map((q) => (q._key === key ? { ...q, ...patch } : q)));

  const applyTemplate = (template: ApplicationTemplate) => {
    const draftChanged = selectedTemplate || f.title !== initial.title || f.slug !== initial.slug || f.description !== initial.description ||
      f.category !== initial.category || f.department !== initial.department || f.icon !== initial.icon ||
      f.requiresWhitelist !== initial.requiresWhitelist || f.grantsWhitelist !== initial.grantsWhitelist ||
      JSON.stringify(qs.map(({ _key, ...q }) => q)) !== JSON.stringify(initial.questions);
    if (draftChanged && !window.confirm("Replace the current draft details and questions with this template?")) return;
    setF((current) => ({
      ...current, slug: template.slug, title: template.title, category: template.category,
      department: template.department, description: template.description, icon: template.icon,
      requiresWhitelist: template.requiresWhitelist, grantsWhitelist: template.grantsWhitelist,
    }));
    setQs(template.questions.map((q) => withKey({ ...q, options: q.options ? [...q.options] : undefined })));
    setOpenQ(null);
    setSelectedTemplate(template.id);
  };

  const save = async () => {
    const body = {
      slug: f.slug,
      title: f.title,
      category: f.category,
      department: f.department || null,
      description: f.description,
      icon: f.icon,
      isOpen: f.isOpen,
      opensAt: f.opensAt ? new Date(f.opensAt).toISOString() : null,
      closesAt: f.closesAt ? new Date(f.closesAt).toISOString() : null,
      minAge: f.minAge ? Number(f.minAge) : null,
      minDiscordAgeDays: Number(f.minDiscordAgeDays),
      requiredRoleIds: f.requiredRoleIds.split(/[\s,]+/).filter(Boolean),
      requiresWhitelist: f.requiresWhitelist,
      grantRoleId: f.grantRoleId || null,
      grantsWhitelist: f.grantsWhitelist,
      cooldownDays: Number(f.cooldownDays),
      webhookUrl: f.webhookUrl || null,
      questions: qs.map(({ _key, ...q }) => clean(q)),
    };
    const r = await run(f.id ? `/api/admin/types/${f.id}` : "/api/admin/types", f.id ? "PUT" : "POST", body, "Application type saved.");
    if (r && !f.id && r.id) router.replace(`/admin/types/${r.id}`);
  };

  const remove = async () => {
    if (!f.id || !window.confirm("Delete this application type? This only works if nobody has applied yet.")) return;
    if (await run(`/api/admin/types/${f.id}`, "DELETE")) router.push("/admin/types");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl">{f.id ? f.title || "Edit type" : "New application type."}</h1>
        <div className="flex gap-2">
          {f.id && (
            <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
              Delete
            </Button>
          )}
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <p aria-live="polite" className="text-sm">
        {error && <span className="text-accent-text">{error}</span>}
        {ok && <span className="text-[#7ee2a8]">{ok}</span>}
      </p>

      {!f.id && (
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Start with a template</p>
              <h2 className="mt-2 text-2xl">Build an application faster</h2>
            </div>
            <p className="max-w-lg text-sm text-white/50">Choose a starting point, then edit the details and questions below. New applications stay closed until you open them.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {APPLICATION_TEMPLATES.map((template) => (
              <button key={template.id} type="button" onClick={() => applyTemplate(template)} aria-pressed={selectedTemplate === template.id}
                className={cn("rounded-lg border p-4 text-left transition-colors", selectedTemplate === template.id ? "border-accent bg-accent/10" : "border-white/10 bg-ink-800 hover:border-accent/50 hover:bg-white/[0.06]")}>
                <AppIcon name={template.icon} size={20} className="text-accent" />
                <span className="mt-3 block font-display text-lg font-bold text-white">{template.name}</span>
                <span className="mt-1 block text-sm text-white/50">{template.summary}</span>
                <span className="mt-3 block text-xs text-white/40">{template.questions.length} questions</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-2xl">Details</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <L label="Title">
            <input className="input" value={f.title} onChange={(e) => {
              set("title", e.target.value);
              if (!f.id) set("slug", slugify(e.target.value));
            }} />
          </L>
          <L label="Slug (URL)">
            <input className="input font-mono" value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </L>
          <L label="Category">
            <select className="input" value={f.category} onChange={(e) => set("category", e.target.value as TypeForm["category"])}>
              <option value="WHITELIST">Whitelist</option>
              <option value="DEPARTMENT">Department</option>
              <option value="STAFF">Staff</option>
              <option value="SPECIAL">Special role</option>
            </select>
          </L>
          <L label="Department key" help="e.g. police, ems, doj. Department heads only see their department.">
            <input className="input" value={f.department} onChange={(e) => set("department", e.target.value)} />
          </L>
          <L label="Description" className="md:col-span-2">
            <textarea className="input min-h-[80px]" value={f.description} maxLength={400} onChange={(e) => set("description", e.target.value)} />
          </L>
          <div className="md:col-span-2">
            <span className="label">Icon</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(APP_ICONS).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={f.icon === name}
                  onClick={() => set("icon", name)}
                  className={cn("chamfer chamfer-sm flex h-10 w-10 items-center justify-center ring-1 ring-inset", f.icon === name ? "bg-accent/20 text-accent ring-accent/50" : "bg-white/[0.04] text-white/60 ring-white/10 hover:text-white")}
                >
                  <AppIcon name={name} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl">Availability &amp; requirements</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Check label="Open for applications" checked={f.isOpen} onChange={(v) => set("isOpen", v)} />
          <Check label="Requires whitelist" checked={f.requiresWhitelist} onChange={(v) => set("requiresWhitelist", v)} />
          <Check label="Accepting grants whitelist" checked={f.grantsWhitelist} onChange={(v) => set("grantsWhitelist", v)} />
          <L label="Opens at (optional)">
            <input type="datetime-local" className="input" value={f.opensAt} onChange={(e) => set("opensAt", e.target.value)} />
          </L>
          <L label="Closes at (optional)">
            <input type="datetime-local" className="input" value={f.closesAt} onChange={(e) => set("closesAt", e.target.value)} />
          </L>
          <L label="Minimum age (shown)">
            <input type="number" className="input" value={f.minAge} onChange={(e) => set("minAge", e.target.value)} />
          </L>
          <L label="Min Discord account age (days)">
            <input type="number" className="input" value={f.minDiscordAgeDays} onChange={(e) => set("minDiscordAgeDays", Number(e.target.value))} />
          </L>
          <L label="Cooldown after denial (days)">
            <input type="number" className="input" value={f.cooldownDays} onChange={(e) => set("cooldownDays", Number(e.target.value))} />
          </L>
          <L label="Required Discord role IDs" help="Comma separated">
            <input className="input font-mono" value={f.requiredRoleIds} onChange={(e) => set("requiredRoleIds", e.target.value)} />
          </L>
          <L label="Role to grant on accept">
            <input className="input font-mono" value={f.grantRoleId} onChange={(e) => set("grantRoleId", e.target.value)} placeholder="Discord role ID" />
          </L>
          <L label="Staff webhook (optional)" help="Defaults to APP_WEBHOOK_URL" className="md:col-span-2">
            <input className="input" value={f.webhookUrl} onChange={(e) => set("webhookUrl", e.target.value)} placeholder="https://discord.com/api/webhooks/…" />
          </L>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Questions</h2>
          <p className="text-sm text-white/45">Drag to reorder. Questions with the same section become one step.</p>
        </div>
        <div className="mt-5 space-y-2">
          <SortableList
            items={qs}
            getId={(q) => q._key}
            onReorder={setQs}
            render={(q, i, handle) => (
              <div className="chamfer chamfer-sm border border-white/10 bg-ink-800">
                <div className="flex items-center gap-2 px-2 py-2">
                  {handle}
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpenQ(openQ === q._key ? null : q._key)} aria-expanded={openQ === q._key}>
                    <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate text-white">{q.label || "Untitled question"}</span>
                    <span className="hidden shrink-0 text-xs text-white/40 sm:inline">
                      {QUESTION_TYPE_LABEL[q.type]} · {q.section || "Questions"}
                      {q.required ? " · required" : ""}
                    </span>
                    <ChevronDown size={16} className={cn("ml-auto shrink-0 text-white/40 transition-transform", openQ === q._key && "rotate-180")} />
                  </button>
                  <button type="button" aria-label="Duplicate question" className="p-2 text-white/40 hover:text-white" onClick={() => setQs((l) => [...l.slice(0, i + 1), withKey({ ...q, id: `${q.id}_copy` }), ...l.slice(i + 1)])}>
                    <Copy size={15} />
                  </button>
                  <button type="button" aria-label="Delete question" className="p-2 text-white/40 hover:text-accent" onClick={() => setQs((l) => l.filter((x) => x._key !== q._key))}>
                    <Trash2 size={15} />
                  </button>
                </div>
                {openQ === q._key && <QuestionFields q={q} onChange={(p) => setQ(q._key, p)} />}
              </div>
            )}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => {
            const q = withKey({ id: `q${qs.length + 1}`, type: "short_text", label: "", required: true, section: qs[qs.length - 1]?.section });
            setQs((l) => [...l, q]);
            setOpenQ(q._key);
          }}
        >
          <Plus size={15} aria-hidden /> Add question
        </Button>
      </Card>
    </div>
  );
}

/** Drop empty optional fields and options on types that don't use them. */
function clean(q: Question): Question {
  const out: Question = { id: q.id, type: q.type, label: q.label, required: q.required };
  if (q.help) out.help = q.help;
  if (q.section) out.section = q.section;
  if (q.placeholder) out.placeholder = q.placeholder;
  if (HAS_OPTIONS.includes(q.type)) out.options = (q.options ?? []).filter(Boolean);
  if (HAS_LENGTH.includes(q.type)) {
    if (q.minLength) out.minLength = q.minLength;
    if (q.maxLength) out.maxLength = q.maxLength;
    if (q.pattern) out.pattern = q.pattern;
    if (q.patternMessage) out.patternMessage = q.patternMessage;
  }
  if (HAS_RANGE.includes(q.type)) {
    if (q.min !== undefined && !Number.isNaN(q.min)) out.min = q.min;
    if (q.max !== undefined && !Number.isNaN(q.max)) out.max = q.max;
  }
  return out;
}

function QuestionFields({ q, onChange }: { q: Question; onChange: (p: Partial<Question>) => void }) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="grid gap-4 border-t border-white/5 p-4 md:grid-cols-2">
      <L label="Question" className="md:col-span-2">
        <input className="input" value={q.label} onChange={(e) => onChange({ label: e.target.value })} />
      </L>
      <L label="Field type">
        <select className="input" value={q.type} onChange={(e) => onChange({ type: e.target.value as QuestionType })}>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </L>
      <L label="ID (stored key)">
        <input className="input font-mono" value={q.id} onChange={(e) => onChange({ id: e.target.value.replace(/[^a-z0-9_-]/gi, "_") })} />
      </L>
      <L label="Section / step">
        <input className="input" value={q.section ?? ""} onChange={(e) => onChange({ section: e.target.value })} />
      </L>
      <Check label="Required" checked={q.required} onChange={(v) => onChange({ required: v })} />
      <L label="Help text" className="md:col-span-2">
        <input className="input" value={q.help ?? ""} onChange={(e) => onChange({ help: e.target.value })} />
      </L>
      {HAS_OPTIONS.includes(q.type) && (
        <L label="Options (one per line)" className="md:col-span-2">
          <textarea className="input min-h-[100px]" value={(q.options ?? []).join("\n")} onChange={(e) => onChange({ options: e.target.value.split("\n") })} />
        </L>
      )}
      {HAS_LENGTH.includes(q.type) && (
        <>
          <L label="Min characters"><input type="number" className="input" value={q.minLength ?? ""} onChange={(e) => onChange({ minLength: num(e.target.value) })} /></L>
          <L label="Max characters"><input type="number" className="input" value={q.maxLength ?? ""} onChange={(e) => onChange({ maxLength: num(e.target.value) })} /></L>
          <L label="Regex (optional)"><input className="input font-mono" value={q.pattern ?? ""} onChange={(e) => onChange({ pattern: e.target.value })} /></L>
          <L label="Regex error message"><input className="input" value={q.patternMessage ?? ""} onChange={(e) => onChange({ patternMessage: e.target.value })} /></L>
        </>
      )}
      {HAS_RANGE.includes(q.type) && (
        <>
          <L label={q.type === "number" ? "Minimum" : "Min selections"}><input type="number" className="input" value={q.min ?? ""} onChange={(e) => onChange({ min: num(e.target.value) })} /></L>
          <L label={q.type === "number" ? "Maximum" : "Max selections"}><input type="number" className="input" value={q.max ?? ""} onChange={(e) => onChange({ max: num(e.target.value) })} /></L>
        </>
      )}
    </div>
  );
}

function L({ label, help, children, className }: { label: string; help?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-white/40">{help}</span>}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 self-end py-3">
      <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}
