"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, LayoutTemplate, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Markdown } from "@/components/content/markdown";
import { cn } from "@/lib/utils";
import { ENTRY_TEMPLATES, SNIPPETS, hasTemplates, insertSnippet, type EntryTemplate, type Snippet } from "@/lib/content-templates";
import { SortableList } from "./sortable";
import { useAction } from "./use-action";

type Kind = "rules" | "guides" | "faq" | "tiers" | "creators";
type Field =
  | { key: string; label: string; type: "text" | "number" | "color" | "url"; help?: string; wide?: boolean }
  | { key: string; label: string; type: "select"; options: string[]; help?: string }
  | { key: string; label: string; type: "markdown"; help?: string }
  | { key: string; label: string; type: "textarea"; help?: string }
  | { key: string; label: string; type: "list"; help?: string }
  | { key: string; label: string; type: "bool"; help?: string };

type Item = Record<string, unknown> & { id?: string; order?: number };

const CONFIG: Record<Kind, { title: (i: Item) => string; sub: (i: Item) => string; group?: string; fields: Field[]; blank: Item }> = {
  rules: {
    title: (i) => String(i.title),
    sub: (i) => String(i.pointsLabel ?? ""),
    group: "category",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["GENERAL", "GANGS", "GOVERNMENT", "BUSINESSES", "DISCORD"] },
      { key: "pointsLabel", label: "Punishment badge", type: "text", help: 'e.g. "10–50 Points" or "Staff Discretion"' },
      { key: "slug", label: "Anchor slug", type: "text", help: "Leave blank to generate from the title" },
      { key: "body", label: "Body", type: "markdown" },
    ],
    blank: { title: "", category: "GENERAL", pointsLabel: "", slug: "", body: "" },
  },
  guides: {
    title: (i) => String(i.title),
    sub: (i) => `${i.category}${i.published ? "" : " · draft"}`,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["Getting Started", "Jobs & Careers", "Economy", "Housing", "Vehicles", "Crime", "Departments", "Keybinds & Commands", "Technical/Troubleshooting"] },
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "cover", label: "Cover image URL", type: "url", help: "1600×1200 recommended, e.g. /images/guides/01.svg" },
      { key: "slug", label: "Slug", type: "text", help: "Leave blank to generate from the title" },
      { key: "published", label: "Published", type: "bool" },
      { key: "body", label: "Body", type: "markdown", help: "Callouts: > [!TIP] / > [!WARNING] / > [!NOTE]. Keys: `kbd:F1`." },
    ],
    blank: { title: "", category: "Getting Started", excerpt: "", cover: "", slug: "", published: true, body: "" },
  },
  faq: {
    title: (i) => String(i.question),
    sub: (i) => String(i.category),
    group: "category",
    fields: [
      { key: "question", label: "Question", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "slug", label: "Anchor slug", type: "text", help: "Leave blank to generate" },
      { key: "answer", label: "Answer", type: "markdown" },
    ],
    blank: { question: "", category: "Getting in", slug: "", answer: "" },
  },
  tiers: {
    title: (i) => String(i.name),
    sub: (i) => `$${i.price}/${i.interval} · +${i.priority} priority`,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "color", label: "Colour", type: "color" },
      { key: "price", label: "Price", type: "number" },
      { key: "currency", label: "Currency", type: "text" },
      { key: "interval", label: "Interval", type: "text", help: "mo, yr…" },
      { key: "priority", label: "Queue priority", type: "number" },
      { key: "benefits", label: "Benefits (one per line)", type: "list" },
      { key: "tebexPackageId", label: "Tebex package ID", type: "text", help: "Used by the Tebex webhook to match purchases" },
      { key: "tebexUrl", label: "Tebex checkout URL", type: "url", wide: true },
      { key: "discordRoleId", label: "Discord role ID", type: "text" },
    ],
    blank: { name: "", color: "#C0C4CC", price: 10, currency: "USD", interval: "mo", priority: 10, benefits: [], tebexPackageId: "", tebexUrl: "", discordRoleId: "" },
  },
  creators: {
    title: (i) => String(i.name),
    sub: (i) => [i.twitchLogin && "Twitch", i.youtubeChannelId && "YouTube", i.tiktok && "TikTok", i.kick && "Kick"].filter(Boolean).join(" · ") + (i.featured ? " · featured" : "") + (i.approved ? "" : " · hidden"),
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "avatar", label: "Avatar URL", type: "url", help: "Filled from Twitch automatically if blank" },
      { key: "twitchLogin", label: "Twitch username", type: "text" },
      { key: "youtubeChannelId", label: "YouTube channel ID", type: "text", help: "Starts with UC…" },
      { key: "tiktok", label: "TikTok handle", type: "text" },
      { key: "kick", label: "Kick username", type: "text" },
      { key: "characters", label: "Characters (one per line)", type: "list" },
      { key: "featured", label: "Featured (Worth a watch)", type: "bool" },
      { key: "approved", label: "Approved (shown on site)", type: "bool" },
    ],
    blank: { name: "", avatar: "", twitchLogin: "", youtubeChannelId: "", tiktok: "", kick: "", characters: [], featured: false, approved: true },
  },
};

export function ContentManager({ kind, items: initial }: { kind: Kind; items: Item[] }) {
  const cfg = CONFIG[kind];
  const { run, busy, error, ok } = useAction();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Item | null>(null);
  const [preview, setPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const templates = hasTemplates(kind) ? ENTRY_TEMPLATES[kind] : [];
  const snippets = hasTemplates(kind) ? SNIPPETS[kind] : [];

  useEffect(() => setItems(initial), [initial]);

  const isDirty = (e: Item | null) => !!e && cfg.fields.some((f) => JSON.stringify(e[f.key] ?? "") !== JSON.stringify((e.id ? items.find((i) => i.id === e.id) : cfg.blank)?.[f.key] ?? ""));

  const applyTemplate = (t: EntryTemplate) => {
    if (isDirty(editing) && !window.confirm("Replace what you're editing with this template?")) return;
    setEditing({ ...cfg.blank, ...t.values });
    setPreview(false);
    setShowTemplates(false);
  };

  const groups = useMemo(() => {
    if (!cfg.group) return [{ name: "", items }];
    const names = Array.from(new Set(items.map((i) => String(i[cfg.group!]))));
    return names.map((name) => ({ name, items: items.filter((i) => String(i[cfg.group!]) === name) }));
  }, [items, cfg.group]);

  const reorder = async (groupName: string, reordered: Item[]) => {
    const next = cfg.group ? groups.flatMap((g) => (g.name === groupName ? reordered : g.items)) : reordered;
    setItems(next);
    await run(`/api/admin/content/${kind}/reorder`, "POST", { ids: next.map((i) => i.id) }, "Order saved.");
  };

  const save = async () => {
    if (!editing) return;
    const body: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      const v = editing[f.key];
      body[f.key] = f.type === "number" ? Number(v) : f.type === "list" ? (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((s) => String(s).trim()).filter(Boolean) : v ?? (f.type === "bool" ? false : "");
    }
    const r = await run(editing.id ? `/api/admin/content/${kind}/${editing.id}` : `/api/admin/content/${kind}`, editing.id ? "PUT" : "POST", body, "Saved. The public page updates right away.");
    if (r) setEditing(null);
  };

  const remove = async (item: Item) => {
    if (!window.confirm(`Delete "${cfg.title(item)}"?`)) return;
    await run(`/api/admin/content/${kind}/${item.id}`, "DELETE", undefined, "Deleted.");
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">{items.length} items · drag to reorder</p>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShowTemplates((s) => !s)} aria-expanded={showTemplates} aria-controls="content-templates">
                <LayoutTemplate size={15} aria-hidden /> Templates
              </Button>
            )}
            <Button size="sm" onClick={() => { setEditing({ ...cfg.blank }); setPreview(false); }}>
              <Plus size={15} aria-hidden /> Add
            </Button>
          </div>
        </div>
        {showTemplates && (
          <div id="content-templates" className="item mt-3 p-4">
            <div className="flex items-center justify-between">
              <p className="label !mb-0">Start from a template</p>
              <button type="button" className="p-1 text-white/45 hover:text-white" aria-label="Close templates" onClick={() => setShowTemplates(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="rounded-lg border border-white/10 bg-ink-800 p-3 text-left transition-colors hover:border-accent/50 hover:bg-white/[0.06]">
                  <span className="block font-semibold text-white">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{t.summary}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/40">Replace anything in [square brackets]. New guides start as drafts.</p>
          </div>
        )}
        <p aria-live="polite" className="mt-2 min-h-5 text-sm">
          {error && <span className="text-accent-text">{error}</span>}
          {ok && <span className="text-[#7ee2a8]">{ok}</span>}
        </p>
        <div className="mt-2 space-y-6">
          {groups.map((g) => (
            <section key={g.name || "all"}>
              {g.name && <h2 className="mb-2 font-digits text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{g.name}</h2>}
              <div className="space-y-1.5">
                <SortableList
                  items={g.items}
                  getId={(i) => String(i.id)}
                  onReorder={(r) => reorder(g.name, r)}
                  render={(item, _i, handle) => (
                    <div className={cn("chamfer chamfer-sm flex items-center gap-2 border bg-ink-800 px-2 py-2", editing?.id === item.id ? "border-accent/50" : "border-white/10")}>
                      {handle}
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setEditing({ ...item }); setPreview(false); }}>
                        <p className="truncate text-white">{cfg.title(item)}</p>
                        <p className="truncate text-xs text-white/40">{cfg.sub(item)}</p>
                      </button>
                      <button type="button" className="p-2 text-white/40 hover:text-white" aria-label={`Edit ${cfg.title(item)}`} onClick={() => setEditing({ ...item })}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="p-2 text-white/40 hover:text-accent" aria-label={`Delete ${cfg.title(item)}`} onClick={() => remove(item)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                />
              </div>
            </section>
          ))}
        </div>
      </div>

      {editing && (
        <Card className="2xl:sticky 2xl:top-28 2xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl">{editing.id ? "Edit" : "New"}</h2>
            <div className="flex gap-2">
              {cfg.fields.some((f) => f.type === "markdown") && (
                <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
                  <Eye size={15} aria-hidden /> {preview ? "Edit" : "Preview"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {cfg.fields.map((f) => (
              <FieldEditor key={f.key} field={f} value={editing[f.key]} preview={preview} snippets={snippets} onChange={(v) => setEditing((e) => ({ ...e!, [f.key]: v }))} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FieldEditor({ field: f, value, preview, snippets = [], onChange }: { field: Field; value: unknown; preview: boolean; snippets?: Snippet[]; onChange: (v: unknown) => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);
  useEffect(() => {
    if (pendingCursor.current === null || !area.current) return;
    area.current.focus();
    area.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
    pendingCursor.current = null;
  });
  const insert = (s: Snippet) => {
    const text = String(value ?? "");
    const el = area.current;
    const r = insertSnippet(text, s.markdown, el?.selectionStart ?? text.length, el?.selectionEnd ?? text.length);
    pendingCursor.current = r.cursor;
    onChange(r.text);
  };
  const wide = f.type === "markdown" || f.type === "textarea" || f.type === "list" || ("wide" in f && f.wide);
  const help = f.help && <span className="mt-1 block text-xs text-white/40">{f.help}</span>;
  if (f.type === "bool")
    return (
      <label className="flex cursor-pointer items-center gap-3 self-end py-3">
        <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm text-white">{f.label}</span>
      </label>
    );
  return (
    <label className={cn("block", wide && "md:col-span-2")}>
      <span className="label">{f.label}</span>
      {f.type === "markdown" ? (
        preview ? (
          <div className="chamfer chamfer-sm max-h-[60vh] overflow-y-auto border border-white/10 bg-ink-800 p-5">
            <Markdown>{String(value ?? "")}</Markdown>
          </div>
        ) : (
          <>
            {snippets.length > 0 && (
              <span role="toolbar" aria-label="Insert snippet" className="mb-2 flex flex-wrap gap-1.5">
                {snippets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.markdown}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insert(s)}
                    className="rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-white/70 transition-colors hover:border-accent/50 hover:text-white"
                  >
                    + {s.label}
                  </button>
                ))}
              </span>
            )}
            <textarea ref={area} className="input min-h-[360px] font-mono text-[13px] leading-relaxed" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          </>
        )
      ) : f.type === "textarea" ? (
        <textarea className="input min-h-[90px]" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === "list" ? (
        <textarea className="input min-h-[120px]" value={Array.isArray(value) ? value.join("\n") : String(value ?? "")} onChange={(e) => onChange(e.target.value.split("\n"))} />
      ) : f.type === "select" ? (
        <select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {f.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : f.type === "color" ? (
        <div className="flex gap-2">
          <input type="color" className="h-[50px] w-14 cursor-pointer bg-transparent" value={String(value ?? "#ffffff")} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${f.label} picker`} />
          <input className="input font-mono" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : (
        <input type={f.type === "number" ? "number" : "text"} className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      )}
      {help}
    </label>
  );
}
