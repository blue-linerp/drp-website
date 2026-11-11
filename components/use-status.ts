"use client";
import { useEffect, useState } from "react";

export interface Status {
  online: boolean;
  players: number;
  maxPlayers: number;
  queue: number | null;
  hostname: string;
  checkedAt: string;
}

/** Polls /api/status (server caches 30s). */
export function useStatus(intervalMs = 30_000) {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        const j = (await r.json()) as Status;
        if (alive) setStatus(j);
      } catch {
        if (alive)
          setStatus((s) => ({
            players: s?.players ?? 0,
            maxPlayers: s?.maxPlayers ?? 0,
            queue: null,
            hostname: s?.hostname ?? "",
            online: false,
            checkedAt: new Date().toISOString(),
          }));
      }
    };
    void load();
    const t = setInterval(load, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);
  return status;
}
