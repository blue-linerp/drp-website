"use client";
import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { useAction } from "./use-action";

interface Settings {
  announcement: { enabled: boolean; id: string; text: string; href?: string };
  maintenance: { enabled: boolean; message: string };
  home: { heroImage: string; heroVideo?: string; heroTitle: string; heroSubtitle: string; lifeImage: string; pathImage: string; communityImage: string; playImage: string };
  rulesMeta: { lastUpdated: string; changelog: { date: string; text: string }[] };
  creatorsMeta: { featuredVideoIds: string[] };
}

function Section<T extends object>({ title, desc, settingKey, initial, children }: { title: string; desc: string; settingKey: string; initial: T; children: (v: T, set: (p: Partial<T>) => void) => ReactNode }) {
  const { run, busy, error, ok } = useAction();
  const [v, setV] = useState(initial);
  return (
    <Card className="!p-6">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-white/50">{desc}</p>
      <div className="mt-5 space-y-4">{children(v, (p) => setV((s) => ({ ...s, ...p })))}</div>
      <div className="mt-5 flex items-center gap-4">
        <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/settings/${settingKey}`, "PUT", v, "Saved.")}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <p aria-live="polite" className="text-sm">
          {error && <span className="text-accent-text">{error}</span>}
          {ok && <span className="text-[#7ee2a8]">{ok}</span>}
        </p>
      </div>
    </Card>
  );
}

const Text = ({ label, value, onChange, help, mono }: { label: string; value: string; onChange: (v: string) => void; help?: string; mono?: boolean }) => (
  <label className="block">
    <span className="label">{label}</span>
    <input className={`input ${mono ? "font-mono text-sm" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} />
    {help && <span className="mt-1 block text-xs text-white/40">{help}</span>}
  </label>
);
const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-center gap-3">
    <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-sm text-white">{label}</span>
  </label>
);

export function SettingsForms({ initial, canSite }: { initial: Settings; canSite: boolean }) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      {canSite && (
        <Section title="Announcement bar" desc="A dismissible bar above the header on every page." settingKey="announcement" initial={initial.announcement}>
          {(v, set) => (
            <>
              <Toggle label="Show announcement" checked={v.enabled} onChange={(enabled) => set({ enabled })} />
              <Text label="Text" value={v.text} onChange={(text) => set({ text })} />
              <Text label="Link (optional)" value={v.href ?? ""} onChange={(href) => set({ href })} help="e.g. /applications or https://…" />
              <Text label="Version ID" value={v.id} onChange={(id) => set({ id })} help="Change this to show the bar again to people who dismissed an older one." mono />
            </>
          )}
        </Section>
      )}
      {canSite && (
        <Section title="Maintenance mode" desc="Shows a banner across the site. Doesn't block access." settingKey="maintenance" initial={initial.maintenance}>
          {(v, set) => (
            <>
              <Toggle label="Maintenance banner on" checked={v.enabled} onChange={(enabled) => set({ enabled })} />
              <label className="block">
                <span className="label">Message</span>
                <textarea className="input min-h-[90px]" value={v.message} onChange={(e) => set({ message: e.target.value })} />
              </label>
            </>
          )}
        </Section>
      )}
      <Section title="Home page" desc="Hero copy and images. Images: hero 2560×1440, features 1600×1200." settingKey="home" initial={initial.home}>
        {(v, set) => (
          <>
            <Text label="Hero headline" value={v.heroTitle} onChange={(heroTitle) => set({ heroTitle })} />
            <label className="block">
              <span className="label">Hero subtext (blank = default)</span>
              <textarea className="input min-h-[80px]" value={v.heroSubtitle} onChange={(e) => set({ heroSubtitle: e.target.value })} />
            </label>
            <Text label="Hero image" value={v.heroImage} onChange={(heroImage) => set({ heroImage })} mono />
            <Text label="Hero video (optional, muted loop)" value={v.heroVideo ?? ""} onChange={(heroVideo) => set({ heroVideo })} mono help="An .mp4/.webm URL. The image is used as the poster." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text label="Life in the city image" value={v.lifeImage} onChange={(lifeImage) => set({ lifeImage })} mono />
              <Text label="Choose your path image" value={v.pathImage} onChange={(pathImage) => set({ pathImage })} mono />
              <Text label="Community image" value={v.communityImage} onChange={(communityImage) => set({ communityImage })} mono />
              <Text label="Play page image" value={v.playImage} onChange={(playImage) => set({ playImage })} mono />
            </div>
          </>
        )}
      </Section>
      <Section title="Rules: last updated & changelog" desc="Shown at the top and bottom of the rules page." settingKey="rulesMeta" initial={initial.rulesMeta}>
        {(v, set) => (
          <>
            <label className="block">
              <span className="label">Last updated</span>
              <input type="date" className="input max-w-[220px]" value={v.lastUpdated} onChange={(e) => set({ lastUpdated: e.target.value })} />
            </label>
            <div className="space-y-2">
              <span className="label">Changelog</span>
              {v.changelog.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input type="date" className="input max-w-[170px]" value={c.date} aria-label="Change date" onChange={(e) => set({ changelog: v.changelog.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} />
                  <input className="input" value={c.text} aria-label="Change description" onChange={(e) => set({ changelog: v.changelog.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                  <button type="button" aria-label="Remove entry" className="px-2 text-white/40 hover:text-accent" onClick={() => set({ changelog: v.changelog.filter((_, j) => j !== i) })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => set({ changelog: [{ date: new Date().toISOString().slice(0, 10), text: "" }, ...v.changelog] })}>
                <Plus size={14} aria-hidden /> Add entry
              </Button>
            </div>
          </>
        )}
      </Section>
      <Section title="Creators: Worth a watch" desc="Pin specific YouTube video IDs. Leave empty to show the latest uploads from featured creators." settingKey="creatorsMeta" initial={initial.creatorsMeta}>
        {(v, set) => (
          <label className="block">
            <span className="label">YouTube video IDs (one per line, max 6)</span>
            <textarea
              className="input min-h-[100px] font-mono text-sm"
              value={v.featuredVideoIds.join("\n")}
              onChange={(e) => set({ featuredVideoIds: e.target.value.split("\n").map((s) => s.trim().replace(/^.*[?&]v=|^.*youtu\.be\//, "").slice(0, 20)).slice(0, 6) })}
            />
          </label>
        )}
      </Section>
    </div>
  );
}
