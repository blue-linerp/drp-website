"use client";
import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { useAction } from "./use-action";

export interface QueueRoleRow {
  id: string;
  discordRoleId: string;
  label: string;
  priority: number;
  reservedSlot: boolean;
  color: string;
}

type DiscordRole = { id: string; name: string; color: string | null };
type Draft = Omit<QueueRoleRow, "id"> & { id?: string };

const blank: Draft = { discordRoleId: "", label: "", priority: 25, reservedSlot: false, color: "#E4080A" };

/** Staff editor for Discord role → queue priority. Highest matching role counts; roles don't stack. */
export function QueueRolesManager({ roles, staffBonus }: { roles: QueueRoleRow[]; staffBonus: number }) {
  const { run, busy, error, ok } = useAction();
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    fetch("/api/admin/discord-roles")
      .then((r) => (r.ok ? r.json() : { roles: [] }))
      .then((j: { roles: DiscordRole[] }) => setDiscordRoles(j.roles))
      .catch(() => setDiscordRoles([]));
  }, []);

  const nameOf = (id: string) => discordRoles?.find((r) => r.id === id)?.name;

  const save = async () => {
    if (!draft) return;
    const { id, ...body } = draft;
    const r = await run(id ? `/api/admin/queue-roles/${id}` : "/api/admin/queue-roles", id ? "PUT" : "POST", body, "Queue role saved. It applies to the next connection and the queue within 30 seconds.");
    if (r) setDraft(null);
  };

  return (
    <Card className="!p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">Queue roles</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Give Discord roles queue priority. A player gets the points of their <strong className="text-white">highest</strong> queue role (roles don&apos;t stack), plus their
            supporter tier, staff bonus (+{staffBonus}) and any manual bonus. Players must be whitelisted to queue at all.
          </p>
        </div>
        <Button size="sm" onClick={() => setDraft({ ...blank })}>
          <Plus size={15} aria-hidden /> Add role
        </Button>
      </div>

      {draft && (
        <div className="item mt-5 grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_120px_auto]">
          <label>
            <span className="label">Discord role</span>
            {discordRoles && discordRoles.length > 0 ? (
              <select
                className="input"
                value={draft.discordRoleId}
                onChange={(e) => {
                  const picked = discordRoles.find((r) => r.id === e.target.value);
                  setDraft({ ...draft, discordRoleId: e.target.value, label: draft.label || picked?.name || "", color: picked?.color && picked.color !== "#000000" ? picked.color : draft.color });
                }}
              >
                <option value="">Choose a role…</option>
                {discordRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input font-mono" placeholder="Role ID" value={draft.discordRoleId} onChange={(e) => setDraft({ ...draft, discordRoleId: e.target.value.trim() })} />
            )}
          </label>
          <label>
            <span className="label">Label (shown to players)</span>
            <input className="input" value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </label>
          <label>
            <span className="label">Priority</span>
            <input type="number" min={0} max={10000} className="input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3 text-sm text-white">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" checked={draft.reservedSlot} onChange={(e) => setDraft({ ...draft, reservedSlot: e.target.checked })} />
            Can use reserved slots
          </label>
          <div className="flex gap-2 md:col-span-4">
            <Button size="sm" onClick={save} disabled={busy || !draft.discordRoleId || !draft.label}>
              {busy ? "Saving…" : "Save role"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {error && <span className="text-accent-text">{error}</span>}
        {ok && <span className="text-[#7ee2a8]">{ok}</span>}
      </p>

      {roles.length ? (
        <ul className="mt-2 space-y-2">
          {roles.map((r, i) => (
            <li key={r.id} className="item flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-6 font-mono text-xs text-white/40">#{i + 1}</span>
              <span className="hex h-3 w-3 shrink-0" style={{ background: r.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">{r.label}</span>
                <span className="block truncate font-mono text-xs text-white/40">{nameOf(r.discordRoleId) ?? r.discordRoleId}</span>
              </span>
              {r.reservedSlot && (
                <Badge tone="blue">
                  <ShieldCheck size={12} aria-hidden /> Reserved slots
                </Badge>
              )}
              <span className="font-mono text-lg text-white">+{r.priority}</span>
              <button type="button" aria-label={`Edit ${r.label}`} className="p-2 text-white/45 hover:text-white" onClick={() => setDraft({ ...r })}>
                <Pencil size={15} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${r.label}`}
                className="p-2 text-white/45 hover:text-accent"
                onClick={() => {
                  if (window.confirm(`Remove queue priority from ${r.label}?`)) void run(`/api/admin/queue-roles/${r.id}`, "DELETE", undefined, "Queue role removed.");
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/50">No queue roles yet. Without any, everyone queues on supporter tier, staff bonus and manual bonus only.</p>
      )}
    </Card>
  );
}
