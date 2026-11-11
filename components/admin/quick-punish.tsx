"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { useAction } from "./use-action";

/** Ban or warn by Discord ID (works for players who never signed in to the site). */
export function QuickPunish() {
  const { run, busy, error, ok } = useAction();
  const [discordId, setDiscordId] = useState("");
  const [kind, setKind] = useState<"ban" | "warning">("ban");
  const [reason, setReason] = useState("");
  const [points, setPoints] = useState("20");
  const [hours, setHours] = useState("168");

  return (
    <Card className="!p-6">
      <h2 className="text-2xl">Issue a punishment</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_100px_140px]">
        <label>
          <span className="label">Discord user ID</span>
          <input className="input font-mono" value={discordId} onChange={(e) => setDiscordId(e.target.value.trim())} />
        </label>
        <label>
          <span className="label">Type</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "ban" | "warning")}>
            <option value="ban">Ban</option>
            <option value="warning">Warning</option>
          </select>
        </label>
        <label>
          <span className="label">Points</span>
          <input type="number" className="input" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        {kind === "ban" ? (
          <label>
            <span className="label">Hours (0 = perm)</span>
            <input type="number" min={0} className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        ) : (
          <span />
        )}
        <label className="md:col-span-4">
          <span className="label">Reason</span>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <Button
        size="sm"
        variant="danger"
        className="mt-4"
        disabled={busy || !/^\d{17,20}$/.test(discordId) || reason.trim().length < 3}
        onClick={async () => {
          const body = { discordId, reason, points: Number(points) || 0, ...(kind === "ban" ? { durationHours: Number(hours) > 0 ? Number(hours) : null } : {}) };
          if (await run(kind === "ban" ? "/api/admin/bans" : "/api/admin/warnings", "POST", body, kind === "ban" ? "Ban issued." : "Warning issued.")) {
            setReason("");
            setDiscordId("");
          }
        }}
      >
        Issue {kind}
      </Button>
      <p aria-live="polite" className="mt-3 text-sm">
        {error && <span className="text-accent-text">{error}</span>}
        {ok && <span className="text-[#7ee2a8]">{ok}</span>}
      </p>
    </Card>
  );
}
