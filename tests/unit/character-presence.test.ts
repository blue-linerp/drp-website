import { describe, expect, it } from "vitest";
import { activeCharacterIds } from "@/lib/character-presence";

describe("character presence", () => {
  const snapshot = {
    updatedAt: Date.now(),
    players: [
      { license: "license:one", citizenid: "CHAR1" },
      { license: "license:two", citizenid: "CHAR2" },
    ],
    queue: [],
  };

  it("only marks the currently loaded character for the matching account", () => {
    expect(activeCharacterIds(snapshot, "license:one")).toEqual(["CHAR1"]);
    expect(activeCharacterIds(snapshot, "license:two")).toEqual(["CHAR2"]);
  });

  it("clears presence when the player unloads, disconnects, or has no fresh snapshot", () => {
    expect(activeCharacterIds({ ...snapshot, players: [{ license: "license:one", citizenid: null }] }, "license:one")).toEqual([]);
    expect(activeCharacterIds({ ...snapshot, players: [] }, "license:one")).toEqual([]);
    expect(activeCharacterIds(null, "license:one")).toEqual([]);
    expect(activeCharacterIds(snapshot, null)).toEqual([]);
  });
});
