"use client";
import { Button } from "@/components/ui/button";
import { useAction } from "./use-action";

export function RevokeBan({ id }: { id: string }) {
  const { run, busy, error } = useAction();
  return (
    <div className="text-right">
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          if (window.confirm("Lift this ban?")) void run(`/api/admin/bans/${id}`, "DELETE", undefined, "Ban lifted.");
        }}
      >
        Lift ban
      </Button>
      {error && <p className="mt-1 text-xs text-accent-text">{error}</p>}
    </div>
  );
}
