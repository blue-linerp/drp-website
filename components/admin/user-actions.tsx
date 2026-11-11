"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { useAction } from "./use-action";

const DURATIONS = [
  { label: "1 day", h: 24 },
  { label: "3 days", h: 72 },
  { label: "1 week", h: 168 },
  { label: "2 weeks", h: 336 },
  { label: "30 days", h: 720 },
  { label: "Permanent", h: 0 },
];

export function UserActions(p: {
  userId: string;
  discordId: string;
  whitelisted: boolean;
  priorityBonus: number;
  canWhitelist: boolean;
  canQueue: boolean;
  canBan: boolean;
}) {
  const { run, busy, error, ok } = useAction();
  const [wlReason, setWlReason] = useState("");
  const [bonus, setBonus] = useState(String(p.priorityBonus));
  const [kind, setKind] = useState<"warning" | "ban">("warning");
  const [reason, setReason] = useState("");
  const [points, setPoints] = useState("10");
  const [hours, setHours] = useState(168);

  return (
    <Card className="!p-6">
      <h2 className="text-2xl">Actions</h2>

      <Button size="sm" variant="secondary" className="mt-4" disabled={busy} onClick={() => run(`/api/admin/users/${p.userId}`, "PATCH", { resync: true }, "Roles re-synced from Discord.")}>
        Re-sync Discord roles
      </Button>

      {p.canWhitelist && (
        <div className="mt-6 border-t border-white/5 pt-5">
          <h3 className="text-lg">Whitelist</h3>
          <input className="input mt-3" placeholder="Reason" value={wlReason} onChange={(e) => setWlReason(e.target.value)} aria-label="Whitelist reason" />
          <Button
            size="sm"
            variant={p.whitelisted ? "danger" : "success"}
            className="mt-2"
            disabled={busy || !wlReason}
            onClick={() => run("/api/admin/whitelist", "POST", { discordId: p.discordId, on: !p.whitelisted, reason: wlReason }, p.whitelisted ? "Whitelist removed." : "Whitelisted.")}
          >
            {p.whitelisted ? "Remove whitelist" : "Grant whitelist"}
          </Button>
        </div>
      )}

      {p.canQueue && (
        <div className="mt-6 border-t border-white/5 pt-5">
          <h3 className="text-lg">Manual priority bonus</h3>
          <div className="mt-3 flex gap-2">
            <input type="number" className="input" value={bonus} onChange={(e) => setBonus(e.target.value)} aria-label="Priority bonus" />
            <Button size="sm" disabled={busy || bonus === ""} onClick={() => run(`/api/admin/users/${p.userId}`, "PATCH", { priorityBonus: Number(bonus) }, "Priority updated.")}>
              Save
            </Button>
          </div>
        </div>
      )}

      {p.canBan && (
        <div className="mt-6 border-t border-white/5 pt-5">
          <h3 className="text-lg">Punish</h3>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Punishment type">
            {(["warning", "ban"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`chamfer chamfer-sm py-2 text-sm capitalize ring-1 ring-inset ${kind === k ? "bg-accent/15 text-white ring-accent/50" : "text-white/60 ring-white/10"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea className="input mt-3 min-h-[80px]" placeholder="Reason (the player can see this)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label>
              <span className="label">Points</span>
              <input type="number" className="input" value={points} onChange={(e) => setPoints(e.target.value)} />
            </label>
            {kind === "ban" && (
              <label>
                <span className="label">Duration</span>
                <select className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d.h} value={d.h}>{d.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Button
            size="sm"
            variant="danger"
            className="mt-3 w-full"
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              const body = { discordId: p.discordId, reason, points: Number(points) || 0, ...(kind === "ban" ? { durationHours: hours || null } : {}) };
              if (await run(kind === "ban" ? "/api/admin/bans" : "/api/admin/warnings", "POST", body, kind === "ban" ? "Ban issued. They'll be dropped from the server within 30s." : "Warning issued.")) setReason("");
            }}
          >
            Issue {kind}
          </Button>
        </div>
      )}
      <p aria-live="polite" className="mt-3 text-sm">
        {error && <span className="text-accent-text">{error}</span>}
        {ok && <span className="text-[#7ee2a8]">{ok}</span>}
      </p>
    </Card>
  );
}
