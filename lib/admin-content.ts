import "server-only";
import { z } from "zod";
import { db } from "./db";
import { slugify } from "./utils";

const strList = z.array(z.string().trim().min(1).max(300)).max(50);
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const contentSchemas = {
  rules: z.object({
    category: z.enum(["GENERAL", "GANGS", "GOVERNMENT", "BUSINESSES", "DISCORD"]),
    title: z.string().trim().min(1).max(120),
    slug: optStr(120),
    pointsLabel: optStr(60),
    body: z.string().max(30_000),
  }),
  guides: z.object({
    title: z.string().trim().min(1).max(140),
    slug: optStr(120),
    excerpt: z.string().trim().max(300),
    category: z.string().trim().min(1).max(60),
    cover: optStr(500),
    body: z.string().max(60_000),
    published: z.boolean().default(true),
  }),
  faq: z.object({
    category: z.string().trim().min(1).max(60),
    question: z.string().trim().min(1).max(200),
    slug: optStr(120),
    answer: z.string().max(10_000),
  }),
  tiers: z.object({
    name: z.string().trim().min(1).max(40),
    price: z.coerce.number().int().min(0).max(10_000),
    currency: z.string().trim().length(3).default("USD"),
    interval: z.string().trim().max(10).default("mo"),
    priority: z.coerce.number().int().min(0).max(10_000),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    benefits: strList,
    tebexPackageId: optStr(40),
    tebexUrl: optStr(500),
    discordRoleId: optStr(30),
  }),
  creators: z.object({
    name: z.string().trim().min(1).max(80),
    twitchLogin: optStr(40),
    youtubeChannelId: optStr(40),
    tiktok: optStr(40),
    kick: optStr(40),
    avatar: optStr(500),
    featured: z.boolean().default(false),
    approved: z.boolean().default(true),
    characters: strList,
  }),
} as const;

export type ContentKind = keyof typeof contentSchemas;
export const CONTENT_KINDS = Object.keys(contentSchemas) as ContentKind[];

/** Prisma delegates share the same shape for these calls; a narrow interface keeps it typed enough. */
interface Delegate {
  findMany(args: object): Promise<{ id: string; order: number }[]>;
  create(args: { data: object }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: object }): Promise<{ id: string }>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  aggregate(args: object): Promise<{ _max: { order: number | null } }>;
}

export function delegate(kind: ContentKind): Delegate {
  const map = { rules: db.ruleSection, guides: db.guide, faq: db.faqItem, tiers: db.supporterTier, creators: db.creator };
  return map[kind] as unknown as Delegate;
}

export const revalidateKind: Record<ContentKind, "rules" | "guides" | "faq" | "tiers" | "creators"> = {
  rules: "rules",
  guides: "guides",
  faq: "faq",
  tiers: "tiers",
  creators: "creators",
};

/** Fill derived fields (slug, read time, cleared twitchId when login changes). */
export function prepare(kind: ContentKind, data: Record<string, unknown>) {
  const out = { ...data };
  if (kind === "rules" || kind === "guides") out.slug = (data.slug as string) || slugify(data.title as string);
  if (kind === "faq") out.slug = (data.slug as string) || slugify(data.question as string);
  if (kind === "guides") out.readMinutes = Math.max(1, Math.round(String(data.body).split(/\s+/).length / 220));
  if (kind === "creators") out.twitchId = null; // re-resolved from the login on next live check
  return out;
}
