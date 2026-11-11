"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Link (redirects to the provider) or Unlink (DELETE) for a linkable account. */
export function LinkAction({ provider, linked, name }: { provider: "steam" | "cfx"; linked: boolean; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!linked)
    return (
      <a
        href={`/api/link/${provider}`}
        className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 font-digits text-[13px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
      >
        Link
      </a>
    );

  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Unlink ${name}? You can link it again any time.`)) return;
          setBusy(true);
          setError(null);
          const r = await fetch(`/api/link/${provider}`, { method: "DELETE" }).catch(() => null);
          setBusy(false);
          if (r?.ok) router.refresh();
          else setError("Couldn't unlink");
        }}
        className="rounded-full px-3 py-1.5 font-digits text-[13px] font-semibold text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
      >
        {busy ? "Unlinking…" : "Unlink"}
      </button>
      {error && <span className="text-xs text-accent-text">{error}</span>}
    </span>
  );
}
