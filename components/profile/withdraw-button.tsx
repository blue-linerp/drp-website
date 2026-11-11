"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="text-right">
      <Button
        variant="danger"
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Withdraw this application? You'll need to submit a new one to be considered.")) return;
          setBusy(true);
          const r = await fetch(`/api/applications/${id}/withdraw`, { method: "POST" });
          setBusy(false);
          if (r.ok) router.refresh();
          else setErr((await r.json().catch(() => ({}))).error ?? "Couldn't withdraw.");
        }}
      >
        {busy ? "Withdrawing…" : "Withdraw application"}
      </Button>
      {err && <p role="alert" className="mt-2 text-sm text-accent-text">{err}</p>}
    </div>
  );
}
