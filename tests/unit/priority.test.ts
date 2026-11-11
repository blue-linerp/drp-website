import { describe, expect, it } from "vitest";
import { computePriority, matchQueueRoles, queuePosition, sortQueue, supporterActive } from "@/lib/priority";

const NOW = new Date("2026-11-08T12:00:00Z");

describe("computePriority", () => {
  it("is 0 for a regular player", () => {
    expect(computePriority({ now: NOW })).toEqual({ base: 0, role: 0, supporter: 0, staff: 0, manual: 0, total: 0 });
  });

  it.each([
    ["Silver", 25],
    ["Gold", 40],
    ["Diamond", 80],
    ["Emerald", 120],
  ])("adds the %s tier (+%i)", (_name, prio) => {
    const p = computePriority({ supporterPriority: prio, supporterUntil: new Date("2026-12-01"), now: NOW });
    expect(p.supporter).toBe(prio);
    expect(p.total).toBe(prio);
  });

  it("ignores an expired supporter tier", () => {
    const p = computePriority({ supporterPriority: 120, supporterUntil: new Date("2026-11-01"), now: NOW });
    expect(p.supporter).toBe(0);
  });

  it("treats a tier with no expiry as active", () => {
    expect(computePriority({ supporterPriority: 40, supporterUntil: null, now: NOW }).supporter).toBe(40);
  });

  it("adds the staff bonus only for staff", () => {
    expect(computePriority({ isStaff: true, staffBonus: 200, now: NOW }).total).toBe(200);
    expect(computePriority({ isStaff: false, staffBonus: 200, now: NOW }).total).toBe(0);
  });

  it("sums base + supporter + staff + manual", () => {
    const p = computePriority({ supporterPriority: 80, supporterUntil: null, isStaff: true, staffBonus: 200, manualBonus: 15, now: NOW });
    expect(p).toEqual({ base: 0, role: 0, supporter: 80, staff: 200, manual: 15, total: 295 });
  });

  it("allows a negative manual bonus but never a negative total", () => {
    const p = computePriority({ supporterPriority: 25, supporterUntil: null, manualBonus: -100, now: NOW });
    expect(p.manual).toBe(-100);
    expect(p.total).toBe(0);
  });
});

describe("supporterActive", () => {
  it("compares the expiry to now", () => {
    expect(supporterActive(new Date("2026-11-09"), NOW)).toBe(true);
    expect(supporterActive(new Date("2026-11-07"), NOW)).toBe(false);
  });
});

describe("sortQueue / queuePosition", () => {
  const q = [
    { id: "a", priority: 0, joinedAt: 1 },
    { id: "b", priority: 40, joinedAt: 5 },
    { id: "c", priority: 40, joinedAt: 3 },
    { id: "d", priority: 120, joinedAt: 9 },
    { id: "e", priority: 0, joinedAt: 0 },
  ];

  it("orders by priority desc, then join time asc", () => {
    expect(sortQueue(q).map((x) => x.id)).toEqual(["d", "c", "b", "e", "a"]);
  });

  it("does not mutate the input", () => {
    const copy = [...q];
    sortQueue(q);
    expect(q).toEqual(copy);
  });

  it("returns a 1-based position or null", () => {
    expect(queuePosition(q, (x) => x.id === "b")).toBe(3);
    expect(queuePosition(q, (x) => x.id === "zzz")).toBeNull();
  });
});

describe("queue roles", () => {
  const roles = [
    { discordRoleId: "1", label: "Member", priority: 10, reservedSlot: false },
    { discordRoleId: "2", label: "Booster", priority: 50, reservedSlot: false },
    { discordRoleId: "3", label: "Content Creator", priority: 100, reservedSlot: true },
  ];

  it("uses only the highest matching role", () => {
    const m = matchQueueRoles(["1", "2", "999"], roles);
    expect(m.best?.label).toBe("Booster");
    expect(m.all.map((r) => r.label)).toEqual(["Booster", "Member"]);
    expect(m.reserved).toBe(false);
  });

  it("flags reserved-slot roles", () => {
    expect(matchQueueRoles(["3"], roles).reserved).toBe(true);
  });

  it("returns nothing for players without queue roles", () => {
    const m = matchQueueRoles(["999"], roles);
    expect(m.best).toBeNull();
    expect(m.reserved).toBe(false);
  });

  it("adds the role priority to the total", () => {
    const p = computePriority({ rolePriority: 100, supporterPriority: 25, supporterUntil: null, now: NOW });
    expect(p.role).toBe(100);
    expect(p.total).toBe(125);
  });
});
