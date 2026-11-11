import { describe, expect, it } from "vitest";
import { ENTRY_TEMPLATES, SNIPPETS, insertSnippet, type TemplateKind } from "@/lib/content-templates";
import { contentSchemas } from "@/lib/admin-content";

const KINDS: TemplateKind[] = ["rules", "guides", "faq"];

describe("entry templates", () => {
  it.each(KINDS)("every %s template passes the save schema", (kind) => {
    for (const t of ENTRY_TEMPLATES[kind]) {
      const r = contentSchemas[kind].safeParse(t.values);
      expect(r.success, `${kind}/${t.id}: ${r.success ? "" : JSON.stringify(r.error.flatten().fieldErrors)}`).toBe(true);
    }
  });

  it.each(KINDS)("%s template and snippet ids are unique", (kind) => {
    const ids = ENTRY_TEMPLATES[kind].map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sids = SNIPPETS[kind].map((s) => s.id);
    expect(new Set(sids).size).toBe(sids.length);
  });
});

describe("insertSnippet", () => {
  it("inserts inline snippets at the cursor without padding", () => {
    expect(insertSnippet("Press  to open", "`kbd:E`", 6, 6)).toEqual({ text: "Press `kbd:E` to open", cursor: 13 });
  });

  it("separates block snippets with a blank line", () => {
    const r = insertSnippet("Intro", "- a\n- b\n", 5, 5);
    expect(r.text).toBe("Intro\n\n- a\n- b\n");
    expect(r.cursor).toBe(r.text.length);
  });

  it("replaces the selection", () => {
    expect(insertSnippet("one TWO three", "2", 4, 7).text).toBe("one 2 three");
  });

  it("doesn't add padding into an empty body", () => {
    expect(insertSnippet("", "> [!TIP]\n> x\n", 0, 0).text).toBe("> [!TIP]\n> x\n");
  });
});
