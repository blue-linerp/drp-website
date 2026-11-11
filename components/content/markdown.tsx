import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import { Lightbulb, TriangleAlert, Info } from "lucide-react";
import GithubSlugger from "github-slugger";
import { cn } from "@/lib/utils";

/** Sanitize first, then add heading ids (slug prefix-free so TOC links match). */
const schema = { ...defaultSchema, clobberPrefix: "", clobber: [] as string[] };

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

const CALLOUTS = {
  TIP: { icon: Lightbulb, cls: "border-status-online/60 bg-status-online/[0.06]", label: "Tip", iconCls: "text-status-online" },
  WARNING: { icon: TriangleAlert, cls: "border-status-checking/60 bg-status-checking/[0.06]", label: "Warning", iconCls: "text-status-checking" },
  NOTE: { icon: Info, cls: "border-tier-diamond/60 bg-tier-diamond/[0.06]", label: "Note", iconCls: "text-tier-diamond" },
} as const;

const components: Components = {
  a({ href = "", children }) {
    if (href.startsWith("/") || href.startsWith("#")) return <Link href={href}>{children}</Link>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  code({ children, className }) {
    const text = textOf(children);
    if (!className && text.startsWith("kbd:")) return <kbd>{text.slice(4)}</kbd>;
    return <code className={className}>{children}</code>;
  },
  blockquote({ children }) {
    const kids = Children.toArray(children).filter((c) => !(typeof c === "string" && !c.trim()));
    const first = kids[0];
    const firstText = textOf(first);
    const m = firstText.match(/^\[!(TIP|WARNING|NOTE)\]\s*/);
    if (m) {
      const c = CALLOUTS[m[1] as keyof typeof CALLOUTS];
      const Icon = c.icon;
      const firstChildren = isValidElement(first) ? Children.toArray((first.props as { children?: ReactNode }).children) : [];
      if (typeof firstChildren[0] === "string") firstChildren[0] = (firstChildren[0] as string).replace(/^\[!(TIP|WARNING|NOTE)\]\s*/, "");
      return (
        <aside role="note" aria-label={c.label} className={cn("chamfer chamfer-sm not-italic my-6 flex gap-4 border-l-2 px-5 py-4 text-white/80", c.cls)}>
          <Icon size={20} className={cn("mt-0.5 shrink-0", c.iconCls)} aria-hidden />
          <div className="[&>p]:my-0">
            <p>{firstChildren}</p>
            {kids.slice(1)}
          </div>
        </aside>
      );
    }
    return <blockquote>{children}</blockquote>;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  },
  img({ src, alt }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />;
  },
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-drp", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema], rehypeSlug]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** h2/h3 headings for a table of contents; ids match rehype-slug output. */
export function extractToc(md: string) {
  const slugger = new GithubSlugger();
  const out: { depth: number; text: string; id: string }[] = [];
  let inCode = false;
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*$/);
    if (m) {
      const text = m[2].replace(/[`*_]/g, "");
      out.push({ depth: m[1].length, text, id: slugger.slug(text) });
    }
  }
  return out;
}
