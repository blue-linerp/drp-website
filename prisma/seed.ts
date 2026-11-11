/**
 * Seeds tiers, application types, rules, guides, FAQ, creators and settings.
 * Content is created on first run only (tables that already have rows are left alone),
 * so admin edits are never overwritten. SEED_FORCE=1 re-imports /content over existing rows.
 */
import { PrismaClient, type ApplicationCategory, type RuleCategory } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseEntries, parseSingle } from "../lib/frontmatter";
import { questionsSchema, type Question } from "../lib/questions";
import { slugify } from "../lib/utils";

const db = new PrismaClient();
const FORCE = process.env.SEED_FORCE === "1";
const SHORT = process.env.NEXT_PUBLIC_SHORT_NAME || "Dream RP";
const content = (...p: string[]) => readFileSync(path.join(process.cwd(), "content", ...p), "utf8");

const tiers = [
  {
    name: "Silver",
    price: 25,
    priority: 25,
    color: "#C0C4CC",
    benefits: ["Silver Discord role and channels", "Social media (in-game Twitter) verification", "VIP chain", "VIP ringtones"],
    env: "SILVER",
  },
  {
    name: "Gold",
    price: 40,
    priority: 40,
    color: "#E6B450",
    benefits: ["Gold Discord role and channels", "VIP emotes", "Everything in Silver"],
    env: "GOLD",
  },
  {
    name: "Diamond",
    price: 80,
    priority: 80,
    color: "#7FD3FF",
    benefits: ["Diamond Discord role and channels", "Everything in Gold and Silver"],
    env: "DIAMOND",
  },
  {
    name: "Emerald",
    price: 120,
    priority: 120,
    color: "#2ECC8F",
    benefits: ["Emerald Discord role and channels", "Cinematic Camera", "Everything in Diamond, Gold and Silver"],
    env: "EMERALD",
  },
];

const agree: Question = { id: "agree_rules", type: "agree_rules", label: "I have read and agree to the server rules.", required: true, section: "Final check" };
const aboutYou = (minAge: number): Question[] => [
  { id: "age", type: "number", label: "How old are you?", required: true, min: minAge, max: 99, section: "About you", help: `You must be ${minAge} or older.` },
  { id: "timezone", type: "select", label: "Which timezone are you in?", required: true, section: "About you", options: ["NA East", "NA Central", "NA West", "EU", "OCE", "Other"] },
  { id: "rp_experience", type: "long_text", label: "Tell us about your roleplay experience.", required: true, minLength: 100, maxLength: 1500, section: "About you", help: "Servers you've played on, characters you've played, and what you enjoyed. New to RP? Tell us why you want to start." },
];

const types: {
  slug: string;
  title: string;
  category: ApplicationCategory;
  department?: string;
  description: string;
  icon: string;
  minAge?: number;
  minDiscordAgeDays: number;
  requiresWhitelist: boolean;
  grantsWhitelist?: boolean;
  grantRoleEnv?: string;
  cooldownDays: number;
  isOpen?: boolean;
  questions: Question[];
}[] = [
  {
    slug: "whitelist",
    title: "Whitelist",
    category: "WHITELIST",
    description: `Your ticket into the city. Tell us who you are and who you want to be in ${SHORT}.`,
    icon: "key-round",
    minAge: 18,
    minDiscordAgeDays: 30,
    requiresWhitelist: false,
    grantsWhitelist: true,
    cooldownDays: 14,
    questions: [
      ...aboutYou(18),
      { id: "how_found", type: "radio", label: `How did you find ${SHORT}?`, required: true, section: "About you", options: ["A friend", "A streamer", "TikTok / YouTube", "Server list", "Other"] },
      { id: "character_name", type: "short_text", label: "What's your character's name?", required: true, minLength: 3, maxLength: 60, section: "Your character", pattern: "^[A-Za-z' -]+$", patternMessage: "Use a realistic first and last name (letters only)." },
      { id: "character_backstory", type: "long_text", label: "Give us a short backstory for your character.", required: true, minLength: 250, maxLength: 3000, section: "Your character", help: "Who are they, where are they from, and why did they come to the city?" },
      { id: "character_goals", type: "long_text", label: "What are your character's goals for their first month?", required: true, minLength: 100, maxLength: 1500, section: "Your character" },
      { id: "scenario_fear", type: "long_text", label: "You're walking home and three armed people surround you and demand your wallet. What do you do, and why?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "scenario_meta", type: "long_text", label: "A friend on Discord tells you where a rival is hiding. What do you do with that information?", required: true, minLength: 100, maxLength: 1200, section: "Scenarios" },
      { id: "define_terms", type: "long_text", label: "In your own words, explain RDM, VDM, metagaming and powergaming.", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "has_mic", type: "yes_no", label: "Do you have a working microphone?", required: true, section: "Final check" },
      agree,
    ],
  },
  {
    slug: "police",
    title: "Police Department",
    category: "DEPARTMENT",
    department: "police",
    description: "Protect and serve. Patrol the city, run investigations, and keep the peace with judgement.",
    icon: "shield",
    minAge: 18,
    minDiscordAgeDays: 60,
    requiresWhitelist: true,
    grantRoleEnv: "POLICE_ROLE_ID",
    cooldownDays: 30,
    questions: [
      ...aboutYou(18),
      { id: "availability", type: "multi_select", label: "When are you usually available?", required: true, section: "About you", options: ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekend days", "Weekend nights"], min: 1 },
      { id: "why_pd", type: "long_text", label: "Why do you want to join the police department?", required: true, minLength: 200, maxLength: 2000, section: "Department" },
      { id: "le_experience", type: "long_text", label: "Describe any previous law enforcement roleplay experience.", required: false, maxLength: 1500, section: "Department" },
      { id: "scenario_pursuit", type: "long_text", label: "A suspect flees in a vehicle through a busy downtown area. Walk us through how you handle the pursuit.", required: true, minLength: 200, maxLength: 2000, section: "Scenarios" },
      { id: "scenario_corruption", type: "long_text", label: "You see a senior officer pocket evidence. What do you do?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "interview_ok", type: "yes_no", label: "Are you able to attend a voice interview in Discord?", required: true, section: "Final check" },
      agree,
    ],
  },
  {
    slug: "ems",
    title: "Emergency Medical Services",
    category: "DEPARTMENT",
    department: "ems",
    description: "First on the scene and last to leave. Save lives and bring calm to chaos.",
    icon: "heart-pulse",
    minAge: 18,
    minDiscordAgeDays: 60,
    requiresWhitelist: true,
    grantRoleEnv: "EMS_ROLE_ID",
    cooldownDays: 30,
    questions: [
      ...aboutYou(18),
      { id: "why_ems", type: "long_text", label: "Why do you want to join EMS?", required: true, minLength: 200, maxLength: 2000, section: "Department" },
      { id: "medical_rp", type: "long_text", label: "How would you roleplay treating a gunshot wound to the leg?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "scenario_mass", type: "long_text", label: "You arrive at a crash with four injured people and you're the only medic. How do you prioritise?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "interview_ok", type: "yes_no", label: "Are you able to attend a voice interview in Discord?", required: true, section: "Final check" },
      agree,
    ],
  },
  {
    slug: "doj",
    title: "Department of Justice",
    category: "DEPARTMENT",
    department: "doj",
    description: "Judges, prosecutors and defence attorneys. Argue the case and shape the law of the city.",
    icon: "scale",
    minAge: 18,
    minDiscordAgeDays: 60,
    requiresWhitelist: true,
    grantRoleEnv: "DOJ_ROLE_ID",
    cooldownDays: 30,
    questions: [
      ...aboutYou(18),
      { id: "role", type: "radio", label: "Which role are you applying for?", required: true, section: "Department", options: ["Defence attorney", "Prosecutor", "Judge"] },
      { id: "why_doj", type: "long_text", label: "Why do you want to join the DOJ?", required: true, minLength: 200, maxLength: 2000, section: "Department" },
      { id: "scenario_case", type: "long_text", label: "Your client was arrested without being read their rights, but there's strong video evidence. How do you approach the case?", required: true, minLength: 200, maxLength: 2000, section: "Scenarios" },
      agree,
    ],
  },
  {
    slug: "staff",
    title: "Staff Team",
    category: "STAFF",
    description: "Help keep the city running. Handle tickets, support players and uphold the rules fairly.",
    icon: "badge-check",
    minAge: 18,
    minDiscordAgeDays: 180,
    requiresWhitelist: true,
    grantRoleEnv: "STAFF_TRIAL_ROLE_ID",
    cooldownDays: 60,
    questions: [
      ...aboutYou(18),
      { id: "hours", type: "number", label: "Roughly how many hours a week could you give to staff duties?", required: true, min: 1, max: 80, section: "About you" },
      { id: "staff_experience", type: "long_text", label: "Describe your previous moderation or staff experience.", required: true, minLength: 100, maxLength: 2000, section: "Staff" },
      { id: "why_staff", type: "long_text", label: "Why do you want to be on staff?", required: true, minLength: 200, maxLength: 2000, section: "Staff" },
      { id: "scenario_friend", type: "long_text", label: "A close friend breaks a rule and another player reports it. How do you handle the ticket?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      { id: "scenario_heated", type: "long_text", label: "Two players are arguing angrily in OOC chat and both blame each other. What do you do?", required: true, minLength: 150, maxLength: 1500, section: "Scenarios" },
      agree,
    ],
  },
  {
    slug: "gang",
    title: "Gang Registration",
    category: "SPECIAL",
    description: "Register your crew. Colours, territory and a story the city will remember.",
    icon: "flame",
    minDiscordAgeDays: 30,
    requiresWhitelist: true,
    grantRoleEnv: "GANG_ROLE_ID",
    cooldownDays: 30,
    questions: [
      { id: "gang_name", type: "short_text", label: "Gang name", required: true, minLength: 2, maxLength: 60, section: "The gang" },
      { id: "colours", type: "short_text", label: "Gang colours", required: true, maxLength: 80, section: "The gang", help: "Colours must not be taken by another registered gang." },
      { id: "members", type: "long_text", label: "List your founding members (character names and Discord usernames).", required: true, minLength: 20, maxLength: 1500, section: "The gang", help: "At least 4 founding members." },
      { id: "story", type: "long_text", label: "What's your gang's story? How did it form and what does it want?", required: true, minLength: 300, maxLength: 3000, section: "Story" },
      { id: "territory", type: "short_text", label: "Which area of the city do you want to operate in?", required: true, maxLength: 120, section: "Story" },
      { id: "rp_plan", type: "long_text", label: "How will your gang create roleplay for people outside of it?", required: true, minLength: 150, maxLength: 1500, section: "Story" },
      agree,
    ],
  },
  {
    slug: "business",
    title: "Business Ownership",
    category: "SPECIAL",
    description: "Open a restaurant, a garage, a club, or something new. Hire people and build something lasting.",
    icon: "store",
    minDiscordAgeDays: 30,
    requiresWhitelist: true,
    cooldownDays: 30,
    questions: [
      { id: "business_name", type: "short_text", label: "Business name", required: true, maxLength: 80, section: "The business" },
      { id: "business_type", type: "select", label: "Type of business", required: true, section: "The business", options: ["Restaurant / café", "Mechanic", "Nightclub / bar", "Retail", "Services", "Other"] },
      { id: "location", type: "short_text", label: "Preferred location", required: false, maxLength: 120, section: "The business" },
      { id: "plan", type: "long_text", label: "Describe your business plan: what you'll sell, who you'll hire, and your opening hours.", required: true, minLength: 250, maxLength: 3000, section: "Plan" },
      { id: "rp_value", type: "long_text", label: "How will your business create roleplay for the city?", required: true, minLength: 150, maxLength: 1500, section: "Plan" },
      { id: "active", type: "yes_no", label: "Can you keep the business active at least 3 days a week?", required: true, section: "Final check" },
      agree,
    ],
  },
  {
    slug: "content-creator",
    title: "Content Creator",
    category: "SPECIAL",
    description: "Stream or post from the city? Get featured on the site and earn the creator role.",
    icon: "video",
    minDiscordAgeDays: 30,
    requiresWhitelist: true,
    grantRoleEnv: "CREATOR_ROLE_ID",
    cooldownDays: 30,
    questions: [
      { id: "platforms", type: "multi_select", label: "Where do you create?", required: true, section: "Your channels", options: ["Twitch", "YouTube", "TikTok", "Kick"], min: 1 },
      { id: "main_channel", type: "url", label: "Link to your main channel", required: true, section: "Your channels" },
      { id: "twitch_login", type: "short_text", label: "Twitch username (if you stream on Twitch)", required: false, maxLength: 40, section: "Your channels", pattern: "^[A-Za-z0-9_]{3,25}$", patternMessage: "Enter just your Twitch username." },
      { id: "schedule", type: "short_text", label: "How often do you stream or post?", required: true, maxLength: 120, section: "Your channels" },
      { id: "characters", type: "short_text", label: "Which characters do you play?", required: true, maxLength: 200, section: "In the city" },
      { id: "why", type: "long_text", label: `Why do you want to create content on ${SHORT}?`, required: true, minLength: 100, maxLength: 1500, section: "In the city" },
      { id: "tag_ok", type: "checkbox", label: `I'll include "${SHORT}" in my stream titles while streaming the server.`, required: true, section: "Final check" },
      agree,
    ],
  },
];

async function seedTiers() {
  for (const [i, t] of tiers.entries()) {
    const data = {
      price: t.price,
      priority: t.priority,
      color: t.color,
      benefits: t.benefits,
      order: i,
      tebexPackageId: process.env[`TEBEX_${t.env}_PACKAGE_ID`] || null,
      tebexUrl: process.env[`TEBEX_${t.env}_URL`] || null,
      discordRoleId: process.env[`${t.env}_ROLE_ID`] || null,
    };
    await db.supporterTier.upsert({ where: { name: t.name }, create: { name: t.name, ...data }, update: FORCE ? data : {} });
  }
}

async function seedTypes() {
  for (const [i, t] of types.entries()) {
    const questions = questionsSchema.parse(t.questions);
    const grantRoleId = t.grantsWhitelist ? process.env.WHITELIST_ROLE_ID || null : t.grantRoleEnv ? process.env[t.grantRoleEnv] || null : null;
    const data = {
      title: t.title,
      category: t.category,
      department: t.department ?? null,
      description: t.description,
      icon: t.icon,
      minAge: t.minAge ?? null,
      minDiscordAgeDays: t.minDiscordAgeDays,
      requiresWhitelist: t.requiresWhitelist,
      grantsWhitelist: t.grantsWhitelist ?? false,
      grantRoleId,
      cooldownDays: t.cooldownDays,
      isOpen: t.isOpen ?? true,
      questions,
      order: i,
    };
    await db.applicationType.upsert({ where: { slug: t.slug }, create: { slug: t.slug, ...data }, update: FORCE ? data : {} });
  }
}

async function seedRules() {
  if (!FORCE && (await db.ruleSection.count())) return;
  const entries = parseEntries(content("rules.md"));
  const orders: Record<string, number> = {};
  for (const e of entries) {
    const category = e.meta.category as RuleCategory;
    const slug = slugify(e.meta.title);
    const order = (orders[category] = (orders[category] ?? -1) + 1);
    const data = { category, title: e.meta.title, pointsLabel: e.meta.points || null, body: e.body, order };
    await db.ruleSection.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
}

async function seedGuides() {
  if (!FORCE && (await db.guide.count())) return;
  const dir = path.join(process.cwd(), "content", "guides");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const { meta, body } = parseSingle(readFileSync(path.join(dir, file), "utf8"));
    const slug = file.replace(/\.md$/, "");
    const words = body.split(/\s+/).length;
    const data = {
      title: meta.title,
      excerpt: meta.excerpt,
      category: meta.category,
      cover: meta.cover || null,
      body,
      order: Number(meta.order ?? 0),
      readMinutes: Math.max(1, Math.round(words / 220)),
      published: true,
    };
    await db.guide.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
}

async function seedFaq() {
  if (!FORCE && (await db.faqItem.count())) return;
  for (const [i, e] of parseEntries(content("faq.md")).entries()) {
    const slug = slugify(e.meta.question);
    const data = { category: e.meta.category, question: e.meta.question, answer: e.body, order: i };
    await db.faqItem.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
}

async function seedSettings() {
  const today = new Date().toISOString().slice(0, 10);
  await db.siteSetting.upsert({
    where: { key: "rulesMeta" },
    create: { key: "rulesMeta", value: { lastUpdated: today, changelog: [{ date: today, text: "Rules published on the new website." }] } },
    update: {},
  });
}

async function main() {
  await seedTiers();
  await seedTypes();
  await seedRules();
  await seedGuides();
  await seedFaq();
  await seedSettings();
  const counts = await Promise.all([db.supporterTier.count(), db.applicationType.count(), db.ruleSection.count(), db.guide.count(), db.faqItem.count()]);
  console.log(`Seeded: ${counts[0]} tiers, ${counts[1]} application types, ${counts[2]} rule sections, ${counts[3]} guides, ${counts[4]} FAQ items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
