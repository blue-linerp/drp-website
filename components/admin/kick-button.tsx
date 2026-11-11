"use client";
import { Button } from "@/components/ui/button";
import { useAction } from "./use-action";

export function KickButton({ license }: { license: string }) {
  const { run, busy, ok, error } = useAction();
  return (
    <span className="inline-flex flex-col items-end">
      <Button
        size="sm"
        variant="danger"
        disabled={busy || !!ok}
        onClick={() => {
          if (window.confirm("Remove this player from the queue?")) void run("/api/admin/queue", "POST", { action: "kick", license }, "Queued for removal");
        }}
      >
        {ok ? "Removing…" : "Kick"}
      </Button>
      {error && <span className="mt-1 text-xs text-accent-text">{error}</span>}
    </span>
  );
}
