"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface Me {
  id: string;
  discordId: string;
  displayName: string;
  avatarUrl: string;
  inGuild: boolean;
  whitelisted: boolean;
  isStaff: boolean;
  staffLevel: string | null;
  priority: { base: number; supporter: number; staff: number; manual: number; total: number };
  tier: { name: string; color: string; priority: number } | null;
  ban: { reason: string; expiresAt: string | null } | null;
  license: string | null;
  pendingWhitelistApp: { id: string; status: string; reference: string } | null;
  queue: { position: number; length: number } | null;
}

interface Ctx {
  me: Me | null;
  loading: boolean;
  refresh: (force?: boolean) => Promise<void>;
}

const MeContext = createContext<Ctx>({ me: null, loading: true, refresh: async () => {} });

/** Client-side session info, so pages stay statically rendered. */
export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async (force = false) => {
    try {
      const res = await fetch(`/api/me${force ? "?sync=1" : ""}`, { cache: "no-store" });
      setMe(res.ok ? ((await res.json()) as { user: Me | null }).user : null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <MeContext.Provider value={{ me, loading, refresh }}>{children}</MeContext.Provider>;
}

export function useMe() {
  return useContext(MeContext);
}
