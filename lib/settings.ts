import "server-only";
import { z } from "zod";
import { db } from "./db";

/** Typed site settings stored in SiteSetting(key, value Json). */
export const settingSchemas = {
  announcement: z.object({
    enabled: z.boolean(),
    id: z.string().max(40),
    text: z.string().max(280),
    href: z.string().max(500).optional().or(z.literal("")),
  }),
  maintenance: z.object({ enabled: z.boolean(), message: z.string().max(500) }),
  home: z.object({
    heroImage: z.string().max(500),
    heroVideo: z.string().max(500).optional().or(z.literal("")),
    heroTitle: z.string().max(120),
    heroSubtitle: z.string().max(400),
    lifeImage: z.string().max(500),
    pathImage: z.string().max(500),
    communityImage: z.string().max(500),
    playImage: z.string().max(500),
  }),
  rulesMeta: z.object({
    lastUpdated: z.string(),
    changelog: z.array(z.object({ date: z.string(), text: z.string().max(500) })).max(50),
  }),
  creatorsMeta: z.object({ featuredVideoIds: z.array(z.string().max(40)).max(6) }),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const settingDefaults: { [K in SettingKey]: SettingValue<K> } = {
  announcement: { enabled: false, id: "welcome", text: "", href: "" },
  maintenance: { enabled: false, message: "We're doing some work on the site. Some features may be unavailable for a few minutes." },
  home: {
    heroImage: "/images/hero.svg",
    heroVideo: "",
    heroTitle: "Make your next move.",
    heroSubtitle: "",
    lifeImage: "/images/feature-life.svg",
    pathImage: "/images/feature-path.svg",
    communityImage: "/images/feature-community.svg",
    playImage: "/images/play.svg",
  },
  rulesMeta: { lastUpdated: new Date().toISOString().slice(0, 10), changelog: [] },
  creatorsMeta: { featuredVideoIds: [] },
};

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key } });
    if (!row) return settingDefaults[key];
    const parsed = settingSchemas[key].safeParse({ ...(settingDefaults[key] as object), ...(row.value as object) });
    return (parsed.success ? parsed.data : settingDefaults[key]) as SettingValue<K>;
  } catch {
    return settingDefaults[key];
  }
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  const parsed = settingSchemas[key].parse(value);
  await db.siteSetting.upsert({ where: { key }, create: { key, value: parsed }, update: { value: parsed } });
}

/** Internal (non-admin-editable) JSON state, e.g. queue snapshot from the FiveM heartbeat. */
export async function getState<T>(key: string, fallback: T): Promise<T> {
  const row = await db.siteSetting.findUnique({ where: { key: `state:${key}` } });
  return (row?.value as T) ?? fallback;
}

export async function setState(key: string, value: unknown) {
  const k = `state:${key}`;
  await db.siteSetting.upsert({ where: { key: k }, create: { key: k, value: value as object }, update: { value: value as object } });
}
