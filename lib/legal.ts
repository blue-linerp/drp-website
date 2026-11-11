import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSingle } from "./frontmatter";

export const LEGAL_PAGES = ["privacy", "terms", "refund"] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

export function readLegal(page: LegalPage) {
  const { meta, body } = parseSingle(readFileSync(path.join(process.cwd(), "content", "legal", `${page}.md`), "utf8"));
  return { title: meta.title, updated: meta.updated, body };
}
