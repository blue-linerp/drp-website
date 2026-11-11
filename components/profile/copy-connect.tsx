"use client";
import { useState } from "react";
import { Check, Gamepad2 } from "lucide-react";

/** Small "Connect with FiveM" link that copies the F8 connect command. */
export function CopyConnect({ target }: { target: string }) {
  const [copied, setCopied] = useState(false);
  if (!target) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`connect ${target}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
      className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
      title={`Copies: connect ${target}`}
    >
      {copied ? <Check size={15} className="text-status-online" aria-hidden /> : <Gamepad2 size={15} aria-hidden />}
      <span aria-live="polite">{copied ? "Command copied. Paste it in F8" : "Copy connect command"}</span>
    </button>
  );
}
