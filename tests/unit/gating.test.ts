import { describe, expect, it } from "vitest";
import { checkEligibility, type GateType, type GateUser, type PriorApp } from "@/lib/gating";

const NOW = new Date("2026-11-08T12:00:00Z");
const DAY = 86_400_000;

const user = (o: Partial<GateUser> = {}): GateUser => ({
  inGuild: true,
  discordCreatedAt: new Date(NOW.getTime() - 400 * DAY),
  roleIds: [],
  whitelisted: false,
  activeBan: null,
  ...o,
});

const type = (o: Partial<GateType> = {}): GateType => ({
  id: "wl",
  isOpen: true,
  opensAt: null,
  closesAt: null,
  minDiscordAgeDays: 30,
  requiredRoleIds: [],
  requiresWhitelist: false,
  grantsWhitelist: true,
  cooldownDays: 14,
  ...o,
});

const code = (r: ReturnType<typeof checkEligibility>) => (r.ok ? "OK" : r.code);

describe("checkEligibility", () => {
  it("allows an eligible applicant", () => {
    expect(checkEligibility(user(), type(), [], NOW)).toEqual({ ok: true });
  });

  it("blocks closed applications and respects open/close dates", () => {
    expect(code(checkEligibility(user(), type({ isOpen: false }), [], NOW))).toBe("CLOSED");
    expect(code(checkEligibility(user(), type({ opensAt: new Date(NOW.getTime() + DAY) }), [], NOW))).toBe("NOT_YET_OPEN");
    expect(code(checkEligibility(user(), type({ closesAt: new Date(NOW.getTime() - 1) }), [], NOW))).toBe("PAST_CLOSE");
    expect(code(checkEligibility(user(), type({ opensAt: new Date(NOW.getTime() - DAY), closesAt: new Date(NOW.getTime() + DAY) }), [], NOW))).toBe("OK");
  });

  it("requires guild membership", () => {
    expect(code(checkEligibility(user({ inGuild: false }), type(), [], NOW))).toBe("NOT_IN_GUILD");
  });

  it("enforces minimum Discord account age and reports when it's met", () => {
    const created = new Date(NOW.getTime() - 10 * DAY);
    const r = checkEligibility(user({ discordCreatedAt: created }), type({ minDiscordAgeDays: 30 }), [], NOW);
    expect(code(r)).toBe("ACCOUNT_TOO_NEW");
    expect(!r.ok && r.until?.getTime()).toBe(created.getTime() + 30 * DAY);
  });

  it("blocks banned users, but not after the ban expires", () => {
    expect(code(checkEligibility(user({ activeBan: { reason: "RDM", expiresAt: null } }), type(), [], NOW))).toBe("BANNED");
    expect(code(checkEligibility(user({ activeBan: { reason: "RDM", expiresAt: new Date(NOW.getTime() - 1) } }), type(), [], NOW))).toBe("OK");
  });

  it("requires whitelist for department applications", () => {
    const police = type({ id: "pd", grantsWhitelist: false, requiresWhitelist: true });
    expect(code(checkEligibility(user(), police, [], NOW))).toBe("NOT_WHITELISTED");
    expect(code(checkEligibility(user({ whitelisted: true }), police, [], NOW))).toBe("OK");
  });

  it("requires every listed Discord role", () => {
    const t = type({ id: "x", grantsWhitelist: false, requiredRoleIds: ["111111111111111111", "222222222222222222"] });
    const r = checkEligibility(user({ roleIds: ["111111111111111111"] }), t, [], NOW);
    expect(code(r)).toBe("MISSING_ROLE");
    expect(!r.ok && r.missingRoleIds).toEqual(["222222222222222222"]);
    expect(code(checkEligibility(user({ roleIds: ["111111111111111111", "222222222222222222"] }), t, [], NOW))).toBe("OK");
  });

  it("stops already-whitelisted players from re-applying for whitelist", () => {
    expect(code(checkEligibility(user({ whitelisted: true }), type(), [], NOW))).toBe("ALREADY_WHITELISTED");
  });

  it.each(["PENDING", "UNDER_REVIEW", "INTERVIEW"] as const)("allows only one open application (%s)", (status) => {
    const prior: PriorApp[] = [{ id: "app1", typeId: "wl", status, decidedAt: null }];
    const r = checkEligibility(user(), type(), prior, NOW);
    expect(code(r)).toBe("PENDING_EXISTS");
    expect(!r.ok && r.applicationId).toBe("app1");
  });

  it("ignores open applications of other types", () => {
    expect(code(checkEligibility(user(), type(), [{ typeId: "pd", status: "PENDING", decidedAt: null }], NOW))).toBe("OK");
  });

  it("applies the cooldown after the most recent denial only", () => {
    const recent: PriorApp[] = [
      { typeId: "wl", status: "DENIED", decidedAt: new Date(NOW.getTime() - 60 * DAY) },
      { typeId: "wl", status: "DENIED", decidedAt: new Date(NOW.getTime() - 3 * DAY) },
    ];
    const r = checkEligibility(user(), type({ cooldownDays: 14 }), recent, NOW);
    expect(code(r)).toBe("COOLDOWN");
    expect(!r.ok && r.until?.getTime()).toBe(NOW.getTime() - 3 * DAY + 14 * DAY);

    const old: PriorApp[] = [{ typeId: "wl", status: "DENIED", decidedAt: new Date(NOW.getTime() - 15 * DAY) }];
    expect(code(checkEligibility(user(), type({ cooldownDays: 14 }), old, NOW))).toBe("OK");
  });

  it("doesn't apply a cooldown after a withdrawal", () => {
    expect(code(checkEligibility(user(), type(), [{ typeId: "wl", status: "WITHDRAWN", decidedAt: null }], NOW))).toBe("OK");
  });
});
