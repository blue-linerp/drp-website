import "server-only";
import { env } from "./env";
import { getState } from "./settings";

export interface ServerStatus {
  online: boolean;
  players: number;
  maxPlayers: number;
  queue: number | null;
  hostname: string;
  checkedAt: string;
}

export interface QueueSnapshotEntry {
  license: string;
  discordId?: string | null;
  name?: string | null;
  priority: number;
  joinedAt: number;
  tier?: string | null;
}
export interface QueueSnapshot {
  updatedAt: number;
  players: { license: string; discordId?: string | null; name?: string | null }[];
  queue: QueueSnapshotEntry[];
  maxClients?: number;
}

export const SNAPSHOT_FRESH_MS = 2 * 60 * 1000;

let cached: { at: number; value: ServerStatus } | null = null;

function stripColors(s: string) {
  return s.replace(/\^\d/g, "").replace(/~[a-zA-Z]~/g, "").trim();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "DRP-Website/1.0" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getQueueSnapshot(): Promise<QueueSnapshot | null> {
  try {
    const snap = await getState<QueueSnapshot | null>("queue", null);
    if (!snap || Date.now() - snap.updatedAt > SNAPSHOT_FRESH_MS) return null;
    return snap;
  } catch {
    return null;
  }
}

/** Live server status, cached 30s. Returns online:false on timeout (3s) or error. */
export async function getServerStatus(): Promise<ServerStatus> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value;
  const snap = await getQueueSnapshot();
  let value: ServerStatus = {
    online: false,
    players: 0,
    maxPlayers: snap?.maxClients ?? 0,
    queue: null,
    hostname: "",
    checkedAt: new Date().toISOString(),
  };

  try {
    if (env.fivemEndpoint) {
      const [dyn, info] = await Promise.all([
        getJson<{ clients: number; sv_maxclients: number | string; hostname?: string }>(`${env.fivemEndpoint}/dynamic.json`),
        getJson<{ vars?: { sv_projectName?: string; sv_maxClients?: string } }>(`${env.fivemEndpoint}/info.json`).catch(() => null),
      ]);
      value = {
        ...value,
        online: true,
        players: Number(dyn.clients) || 0,
        maxPlayers: Number(dyn.sv_maxclients || info?.vars?.sv_maxClients) || value.maxPlayers,
        hostname: stripColors(info?.vars?.sv_projectName || dyn.hostname || ""),
      };
    } else if (env.cfxJoinCode) {
      const data = await getJson<{ Data?: { clients: number; sv_maxclients: number; hostname: string; vars?: { sv_projectName?: string } } }>(
        `https://servers-frontend.fivem.net/api/servers/single/${env.cfxJoinCode}`,
      );
      if (data.Data) {
        value = {
          ...value,
          online: true,
          players: data.Data.clients,
          maxPlayers: data.Data.sv_maxclients,
          hostname: stripColors(data.Data.vars?.sv_projectName || data.Data.hostname),
        };
      }
    } else if (snap) {
      // No endpoint configured: fall back to the gate resource's heartbeat.
      value = { ...value, online: true, players: snap.players.length, maxPlayers: snap.maxClients ?? 0 };
    }
  } catch (e) {
    console.warn("[status]", (e as Error).message);
  }

  if (value.online && snap) value.queue = snap.queue.length;
  cached = { at: Date.now(), value };
  return value;
}

/** Staff commands delivered to the gate resource in the next heartbeat response. */
export interface QueueCommands {
  kicks: { license: string; reason: string; at: number }[];
}
