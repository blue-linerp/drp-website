import type { QueueSnapshot } from "./fivem";

/** Presence comes from the current server snapshot, not the character's last-played timestamp. */
export function activeCharacterIds(snapshot: QueueSnapshot | null, license: string | null): string[] {
  if (!snapshot || !license) return [];
  return snapshot.players
    .filter((player) => player.license === license && !!player.citizenid)
    .map((player) => player.citizenid!);
}
