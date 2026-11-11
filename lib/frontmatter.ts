/**
 * Minimal frontmatter parser for /content files (key: value pairs only).
 * Multi-entry files repeat `---\nkey: value\n---\nbody` blocks.
 */
export interface Entry {
  meta: Record<string, string>;
  body: string;
}

export function applyTokens(s: string) {
  return s
    .replaceAll("{{SERVER_NAME}}", process.env.NEXT_PUBLIC_SERVER_NAME || "Dream Roleplay")
    .replaceAll("{{SHORT_NAME}}", process.env.NEXT_PUBLIC_SHORT_NAME || "Dream RP");
}

function parseMeta(block: string) {
  const meta: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return meta;
}

export function parseEntries(src: string): Entry[] {
  const text = applyTokens(src.replace(/\r\n/g, "\n"));
  const re = /^---\n([\s\S]*?)\n---\n/gm;
  const out: Entry[] = [];
  const matches = Array.from(text.matchAll(re));
  matches.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    out.push({ meta: parseMeta(m[1]), body: text.slice(start, end).trim() });
  });
  return out;
}

export function parseSingle(src: string): Entry {
  return parseEntries(src)[0] ?? { meta: {}, body: applyTokens(src) };
}
