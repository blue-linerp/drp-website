import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { canTransition, isFinal, isOpenStatus } from "@/lib/status-machine";
import { cleanAnswers, questionsSchema, toSteps, validateAnswer, validateAnswers, type Question } from "@/lib/questions";
import { can, resolveAccess } from "@/lib/permissions";
import { interpretTebex, verifyTebexSignature, type TebexWebhook } from "@/lib/tebex";
import { snowflakeToDate } from "@/lib/utils";

describe("application status transitions", () => {
  it("lets staff move through review to a decision", () => {
    expect(canTransition("PENDING", "UNDER_REVIEW", "staff")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "INTERVIEW", "staff")).toBe(true);
    expect(canTransition("INTERVIEW", "ACCEPTED", "staff")).toBe(true);
    expect(canTransition("PENDING", "DENIED", "staff")).toBe(true);
  });

  it("makes decisions final", () => {
    for (const to of ["PENDING", "UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "DENIED", "WITHDRAWN"] as const) {
      expect(canTransition("ACCEPTED", to, "staff")).toBe(false);
      expect(canTransition("DENIED", to, "staff")).toBe(false);
      expect(canTransition("WITHDRAWN", to, "applicant")).toBe(false);
    }
  });

  it("only lets applicants withdraw open applications", () => {
    expect(canTransition("PENDING", "WITHDRAWN", "applicant")).toBe(true);
    expect(canTransition("INTERVIEW", "WITHDRAWN", "applicant")).toBe(true);
    expect(canTransition("PENDING", "ACCEPTED", "applicant")).toBe(false);
    expect(canTransition("ACCEPTED", "WITHDRAWN", "applicant")).toBe(false);
    expect(canTransition("PENDING", "WITHDRAWN", "staff")).toBe(false);
  });

  it("classifies open and final statuses", () => {
    expect(isOpenStatus("INTERVIEW")).toBe(true);
    expect(isOpenStatus("DENIED")).toBe(false);
    expect(isFinal("WITHDRAWN")).toBe(true);
    expect(isFinal("PENDING")).toBe(false);
  });
});

describe("dynamic form validation", () => {
  const qs: Question[] = [
    { id: "age", type: "number", label: "Age", required: true, min: 18, max: 99, section: "About" },
    { id: "story", type: "long_text", label: "Story", required: true, minLength: 20, maxLength: 100, section: "About" },
    { id: "tz", type: "select", label: "TZ", required: true, options: ["EU", "NA"], section: "More" },
    { id: "plat", type: "multi_select", label: "Platforms", required: true, options: ["Twitch", "YouTube"], min: 1, section: "More" },
    { id: "name", type: "short_text", label: "Name", required: true, pattern: "^[A-Za-z ]+$", patternMessage: "Letters only", section: "More" },
    { id: "link", type: "url", label: "Link", required: false, section: "More" },
    { id: "mic", type: "yes_no", label: "Mic", required: true, section: "Final" },
    { id: "agree", type: "agree_rules", label: "Agree", required: true, section: "Final" },
  ];

  it("groups questions into steps by section", () => {
    expect(toSteps(qs).map((s) => [s.title, s.questions.length])).toEqual([
      ["About", 2],
      ["More", 4],
      ["Final", 2],
    ]);
  });

  it("accepts a valid set of answers", () => {
    const answers = { age: 21, story: "x".repeat(30), tz: "EU", plat: ["Twitch"], name: "Sam Reyes", link: "", mic: "yes", agree: true };
    expect(validateAnswers(qs, answers)).toEqual({});
  });

  it("reports each kind of error", () => {
    const errors = validateAnswers(qs, { age: 16, story: "short", tz: "Mars", plat: [], name: "Sam_99", link: "javascript:alert(1)", mic: "maybe", agree: false });
    expect(Object.keys(errors).sort()).toEqual(["age", "agree", "link", "mic", "name", "plat", "story", "tz"]);
    expect(errors.name).toBe("Letters only");
    expect(errors.story).toMatch(/at least 20/);
  });

  it("treats empty optional fields as valid and required ones as missing", () => {
    expect(validateAnswer(qs[5], "")).toBeNull();
    expect(validateAnswer(qs[0], null)).toBe("This field is required.");
  });

  it("strips unknown keys and coerces numbers", () => {
    expect(cleanAnswers(qs, { age: "21" as unknown as number, hacker: "x", tz: "EU" })).toEqual({ age: 21, tz: "EU" });
  });

  it("rejects duplicate ids, missing options and bad regex in the builder", () => {
    const bad = questionsSchema.safeParse([
      { id: "a", type: "short_text", label: "A", required: true },
      { id: "a", type: "select", label: "B", required: true },
      { id: "c", type: "short_text", label: "C", required: true, pattern: "([" },
    ]);
    expect(bad.success).toBe(false);
    const msgs = bad.success ? [] : bad.error.issues.map((i) => i.message);
    expect(msgs.some((m) => m.includes("Duplicate"))).toBe(true);
    expect(msgs.some((m) => m.includes("option"))).toBe(true);
    expect(msgs.some((m) => m.includes("regex"))).toBe(true);
  });
});

describe("permissions", () => {
  const cfg = { adminRoleIds: ["A"], seniorStaffRoleIds: ["S"], staffRoleIds: ["T"], deptHeadRoles: { police: ["P"], ems: ["E"] } };

  it("maps Discord roles to the highest level", () => {
    expect(resolveAccess(["T", "A"], cfg).level).toBe("ADMIN");
    expect(resolveAccess(["S"], cfg).level).toBe("SENIOR_STAFF");
    expect(resolveAccess(["P"], cfg)).toEqual({ level: "DEPT_HEAD", departments: ["police"] });
    expect(resolveAccess(["nothing"], cfg).level).toBeNull();
  });

  it("scopes department heads to their own department", () => {
    const head = resolveAccess(["P"], cfg);
    expect(can(head, "apps.review", { department: "police" })).toBe(true);
    expect(can(head, "apps.review", { department: "ems" })).toBe(false);
    expect(can(head, "apps.review", { department: null })).toBe(false);
    expect(can(head, "bans.manage")).toBe(false);
  });

  it("limits staff to reviewing and viewing", () => {
    const staff = resolveAccess(["T"], cfg);
    expect(can(staff, "apps.review", { department: "ems" })).toBe(true);
    expect(can(staff, "users.view")).toBe(true);
    expect(can(staff, "whitelist.manage")).toBe(false);
    expect(can(resolveAccess(["S"], cfg), "settings.manage")).toBe(false);
    expect(can(resolveAccess(["A"], cfg), "settings.manage")).toBe(true);
  });
});

describe("tebex", () => {
  it("verifies signatures (HMAC of the body's SHA-256)", () => {
    const body = JSON.stringify({ id: "1", type: "payment.completed" });
    const sig = createHmac("sha256", "secret").update(createHash("sha256").update(body).digest("hex")).digest("hex");
    expect(verifyTebexSignature(body, sig, "secret")).toBe(true);
    expect(verifyTebexSignature(body, sig, "other")).toBe(false);
    expect(verifyTebexSignature(body + " ", sig, "secret")).toBe(false);
    expect(verifyTebexSignature(body, null, "secret")).toBe(false);
  });

  it("maps events to grant/revoke", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    const base = { id: "e", date: "", subject: { products: [{ id: 123, name: "Gold" }] } } as TebexWebhook;
    const grant = interpretTebex({ ...base, type: "payment.completed" }, now);
    expect(grant.kind).toBe("grant");
    expect(grant.kind === "grant" && grant.packageIds).toEqual(["123"]);
    const renewed = interpretTebex({ ...base, type: "recurring-payment.renewed", subject: { ...base.subject, next_payment_at: "2026-12-08T00:00:00Z" } }, now);
    expect(renewed.kind === "grant" && renewed.until?.toISOString()).toBe("2026-12-11T00:00:00.000Z");
    expect(interpretTebex({ ...base, type: "recurring-payment.ended" }, now).kind).toBe("revoke");
    expect(interpretTebex({ ...base, type: "payment.refunded" }, now).kind).toBe("revoke");
    expect(interpretTebex({ ...base, type: "something.else" }, now).kind).toBe("ignore");
  });
});

describe("snowflakeToDate", () => {
  it("decodes a Discord ID's creation time", () => {
    expect(snowflakeToDate("175928847299117063").toISOString()).toBe("2016-04-30T11:18:25.796Z");
  });
});
