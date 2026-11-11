"use client";
import { useState } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { isOpenStatus } from "@/lib/status-machine";
import { useAction } from "./use-action";

export function ReviewActions({ id, status, claimedByMe, claimedBy }: { id: string; status: ApplicationStatus; claimedByMe: boolean; claimedBy: string | null }) {
  const { run, busy, error, ok } = useAction();
  const [mode, setMode] = useState<"deny" | "accept" | "interview" | null>(null);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const url = `/api/admin/applications/${id}`;
  const open = isOpenStatus(status);

  const setStatus = async (to: ApplicationStatus, extra: Record<string, unknown> = {}) => {
    const r = await run(url, "PATCH", { kind: "status", to, ...extra }, "Status updated.");
    if (r) {
      setMode(null);
      setReason("");
    }
  };

  return (
    <Card className="!p-6">
      <h2 className="text-2xl">Decision</h2>
      {open ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="success" size="sm" disabled={busy} onClick={() => setMode(mode === "accept" ? null : "accept")}>Accept</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => setMode(mode === "deny" ? null : "deny")}>Deny</Button>
            {status !== "UNDER_REVIEW" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("UNDER_REVIEW")}>Under review</Button>
            )}
            {status !== "INTERVIEW" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setMode(mode === "interview" ? null : "interview")}>Interview</Button>
            )}
          </div>

          {mode === "accept" && (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label">Message to applicant (optional)</span>
                <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
              </label>
              <Button size="sm" variant="success" className="w-full" disabled={busy} onClick={() => setStatus("ACCEPTED", reason ? { reason } : {})}>
                Confirm accept
              </Button>
              <p className="text-xs text-white/45">Adds the configured Discord role, sets whitelist if this is the whitelist app, and DMs the applicant.</p>
            </div>
          )}
          {mode === "deny" && (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label">Reason (sent to applicant)</span>
                <textarea className="input min-h-[100px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
              </label>
              <Button size="sm" variant="danger" className="w-full" disabled={busy || reason.trim().length < 3} onClick={() => setStatus("DENIED", { reason })}>
                Confirm deny
              </Button>
            </div>
          )}
          {mode === "interview" && (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label">Interview time (your local time)</span>
                <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
              </label>
              <Button size="sm" className="w-full" disabled={busy || !when} onClick={() => setStatus("INTERVIEW", { interviewAt: new Date(when).toISOString() })}>
                Schedule interview
              </Button>
            </div>
          )}

          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-sm text-white/55">{claimedBy ? `Claimed by ${claimedByMe ? "you" : claimedBy}` : "Unclaimed"}</p>
            <Button variant="ghost" size="sm" className="mt-2 px-0" disabled={busy} onClick={() => run(url, "PATCH", { kind: "assign", toMe: !claimedByMe }, claimedByMe ? "Unclaimed." : "Assigned to you.")}>
              {claimedByMe ? "Unassign me" : "Assign to me"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/55">This application is closed. No further decisions can be made.</p>
      )}

      <div className="mt-5 border-t border-white/5 pt-4">
        <label className="block">
          <span className="label">Add internal note</span>
          <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
        </label>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={busy || !note.trim()}
          onClick={async () => {
            if (await run(url, "PATCH", { kind: "note", text: note }, "Note added.")) setNote("");
          }}
        >
          Add note
        </Button>
      </div>
      <p aria-live="polite" className="mt-3 text-sm">
        {error && <span className="text-accent-text">{error}</span>}
        {ok && <span className="text-[#7ee2a8]">{ok}</span>}
      </p>
    </Card>
  );
}
