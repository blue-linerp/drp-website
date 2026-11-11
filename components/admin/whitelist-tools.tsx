"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { useAction } from "./use-action";

export function WhitelistTools() {
  const single = useAction();
  const bulk = useAction();
  const [discordId, setDiscordId] = useState("");
  const [reason, setReason] = useState("");
  const [ids, setIds] = useState("");
  const [bulkReason, setBulkReason] = useState("Bulk import");
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card className="!p-6">
        <h2 className="text-2xl">Add or remove whitelist</h2>
        <p className="mt-1 text-sm text-white/50">Updates the database and the Discord role together.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Discord user ID</span>
            <input className="input font-mono" value={discordId} onChange={(e) => setDiscordId(e.target.value.trim())} inputMode="numeric" />
          </label>
          <label>
            <span className="label">Reason</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="success" disabled={single.busy || !discordId || !reason} onClick={() => single.run("/api/admin/whitelist", "POST", { discordId, on: true, reason }, "Whitelisted.")}>
            Whitelist
          </Button>
          <Button size="sm" variant="danger" disabled={single.busy || !discordId || !reason} onClick={() => single.run("/api/admin/whitelist", "POST", { discordId, on: false, reason }, "Whitelist removed.")}>
            Remove
          </Button>
        </div>
        <p aria-live="polite" className="mt-3 text-sm">
          {single.error && <span className="text-accent-text">{single.error}</span>}
          {single.ok && <span className="text-[#7ee2a8]">{single.ok}</span>}
        </p>
      </Card>
      <Card className="!p-6">
        <h2 className="text-2xl">Bulk import</h2>
        <p className="mt-1 text-sm text-white/50">Paste Discord IDs (any separator, up to 500). Each one is whitelisted and gets the role.</p>
        <textarea className="input mt-4 min-h-[96px] font-mono text-xs" value={ids} onChange={(e) => setIds(e.target.value)} placeholder="123456789012345678, 234567890123456789" />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <span className="label">Reason</span>
            <input className="input" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
          </label>
          <Button
            size="sm"
            disabled={bulk.busy || !ids.trim() || !bulkReason}
            onClick={async () => {
              const r = (await bulk.run("/api/admin/whitelist/bulk", "POST", { ids, reason: bulkReason }, "Import finished.")) as { total: number; ok: number; results: { discordId: string; ok: boolean; error?: string }[] } | null;
              if (r) {
                const failed = r.results.filter((x) => !x.ok);
                setResult(`${r.ok} of ${r.total} whitelisted.${failed.length ? ` Failed: ${failed.map((f) => `${f.discordId} (${f.error})`).join("; ")}` : ""}`);
              }
            }}
          >
            {bulk.busy ? "Importing…" : "Import"}
          </Button>
        </div>
        <p aria-live="polite" className="mt-3 text-sm">
          {bulk.error && <span className="text-accent-text">{bulk.error}</span>}
          {result && <span className="text-white/70">{result}</span>}
        </p>
      </Card>
    </div>
  );
}
