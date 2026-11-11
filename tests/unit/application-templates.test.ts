import { describe, expect, it } from "vitest";
import { APPLICATION_TEMPLATES } from "@/lib/application-templates";
import { questionsSchema } from "@/lib/questions";
import { APP_ICONS } from "@/components/apps/icon";

describe("application templates", () => {
  it("provides unique, valid templates that can be saved by the builder", () => {
    expect(new Set(APPLICATION_TEMPLATES.map((t) => t.id)).size).toBe(APPLICATION_TEMPLATES.length);
    expect(new Set(APPLICATION_TEMPLATES.map((t) => t.slug)).size).toBe(APPLICATION_TEMPLATES.length);
    for (const template of APPLICATION_TEMPLATES) {
      expect(template.slug).toMatch(/^[a-z0-9-]+$/);
      expect(APP_ICONS[template.icon]).toBeDefined();
      expect(questionsSchema.safeParse(template.questions).success, template.name).toBe(true);
      expect(template.questions.length).toBeGreaterThan(0);
    }
  });

  it("only grants whitelist access from the whitelist template", () => {
    expect(APPLICATION_TEMPLATES.filter((t) => t.grantsWhitelist).map((t) => t.id)).toEqual(["whitelist"]);
    expect(APPLICATION_TEMPLATES.find((t) => t.id === "whitelist")?.requiresWhitelist).toBe(false);
  });
});
