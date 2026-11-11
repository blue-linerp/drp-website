"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** fetch → refresh server components, with busy/error state for admin forms. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run(url: string, method: string, body?: unknown, success = "Saved.") {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const issues = j.issues?.fieldErrors ? Object.entries(j.issues.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ") : "";
        throw new Error([j.error || `Request failed (${r.status})`, issues].filter(Boolean).join(" — "));
      }
      setOk(success);
      router.refresh();
      return j as Record<string, unknown>;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error, ok, setError };
}
