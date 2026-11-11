/**
 * Insertable templates for the Rules, Guides and FAQ editors (Admin → Content).
 * - ENTRY_TEMPLATES start a new entry with every field prefilled.
 * - SNIPPETS are markdown blocks inserted at the cursor in the body/answer field.
 * Placeholders are written in [SQUARE BRACKETS] so staff can spot what to replace.
 */

export type TemplateKind = "rules" | "guides" | "faq";

export interface EntryTemplate {
  id: string;
  name: string;
  summary: string;
  values: Record<string, unknown>;
}

export interface Snippet {
  id: string;
  label: string;
  markdown: string;
}

/* ------------------------------------------------------------------ rules */

const RULE_TEMPLATES: EntryTemplate[] = [
  {
    id: "rule-basic",
    name: "Standard rule",
    summary: "Definition, what's not allowed, punishment.",
    values: {
      title: "[Rule name]",
      category: "GENERAL",
      pointsLabel: "10–30 Points",
      slug: "",
      body: `[One sentence explaining what this rule means and why it exists.]

**Not allowed:**

- [Example of breaking the rule]
- [Another example]

**Allowed:**

- [Example of acceptable behaviour]

> [!NOTE]
> Staff may adjust punishments based on context and history.`,
    },
  },
  {
    id: "rule-rdm",
    name: "RDM / VDM",
    summary: "Random deathmatch and vehicle deathmatch.",
    values: {
      title: "RDM & VDM",
      category: "GENERAL",
      pointsLabel: "20–50 Points",
      slug: "rdm-vdm",
      body: `**Random Deathmatch (RDM)** is attacking or killing another player without a valid roleplay reason and clear initiation.

**Vehicle Deathmatch (VDM)** is using a vehicle as a weapon without roleplay, including running people over on purpose.

- Initiation must be clear, verbal, and give the other player a chance to respond.
- Old grudges from a previous life do not count as a reason.
- Shooting from a moving vehicle at someone who hasn't been initiated on is RDM.

> [!WARNING]
> Mass RDM (three or more players) is an immediate ban pending staff review.`,
    },
  },
  {
    id: "rule-nlr",
    name: "New Life Rule",
    summary: "What happens after your character is downed.",
    values: {
      title: "New Life Rule (NLR)",
      category: "GENERAL",
      pointsLabel: "10–30 Points",
      slug: "new-life-rule",
      body: `If you are downed and respawn at the hospital, you forget the events that led to your death.

- Do not return to the scene for **[15] minutes**.
- Do not seek revenge on the people involved.
- If you were revived by EMS, you remember the scene and NLR does not apply.`,
    },
  },
  {
    id: "rule-fearrp",
    name: "Value of Life / FearRP",
    summary: "Act like your life matters.",
    values: {
      title: "Value of Life",
      category: "GENERAL",
      pointsLabel: "10–40 Points",
      slug: "value-of-life",
      body: `Your character should value their life as if it were real.

- If you are outnumbered or at gunpoint, comply.
- Don't pull a weapon when one is already aimed at you.
- Don't provoke armed players with no way out.

> [!TIP]
> Losing a scene well often creates better stories than winning it.`,
    },
  },
  {
    id: "rule-meta",
    name: "Metagaming",
    summary: "Using out-of-character information.",
    values: {
      title: "Metagaming",
      category: "GENERAL",
      pointsLabel: "20–40 Points",
      slug: "metagaming",
      body: `Using information your character hasn't learned in-city is metagaming.

**Examples:**

- Using a stream, Discord call or chat to locate or identify someone.
- Knowing a character's name from their overhead ID or Discord.
- Sharing in-city information over Discord with people who weren't there.`,
    },
  },
  {
    id: "rule-gang",
    name: "Gang rule",
    summary: "Limits for organised crime.",
    values: {
      title: "[Gang rule name]",
      category: "GANGS",
      pointsLabel: "Staff Discretion",
      slug: "",
      body: `[What this rule covers for gangs and crews.]

| Limit | Value |
| --- | --- |
| Maximum members in a scene | [6] |
| Maximum members in a gang | [15] |
| Cooldown between wars | [48 hours] |

- [Extra requirement]
- Gang leadership is responsible for their members' conduct.`,
    },
  },
  {
    id: "rule-gov",
    name: "Government / department rule",
    summary: "Rules for PD, EMS and other departments.",
    values: {
      title: "[Department conduct]",
      category: "GOVERNMENT",
      pointsLabel: "Removal from department",
      slug: "",
      body: `Members of government departments represent the city and are held to a higher standard.

- Follow your department's SOPs at all times.
- Don't use department equipment or vehicles off duty.
- Corruption roleplay requires approval from **[department head / staff]**.`,
    },
  },
  {
    id: "rule-business",
    name: "Business rule",
    summary: "Rules for player-owned businesses.",
    values: {
      title: "[Business rule]",
      category: "BUSINESSES",
      pointsLabel: "Business revoked",
      slug: "",
      body: `- Businesses must be open and staffed at least **[X hours per week]**.
- Prices must stay within **[range]** of the market.
- Owners are responsible for their employees' conduct while on duty.`,
    },
  },
  {
    id: "rule-discord",
    name: "Discord conduct",
    summary: "Behaviour in the community Discord.",
    values: {
      title: "Discord Conduct",
      category: "DISCORD",
      pointsLabel: "Warn → Ban",
      slug: "discord-conduct",
      body: `- Be respectful. No harassment, hate speech or discrimination.
- No NSFW content, spam or advertising.
- Keep channels on topic. Use tickets for staff matters.
- Don't share in-city information in out-of-character channels.`,
    },
  },
];

const RULE_SNIPPETS: Snippet[] = [
  { id: "not-allowed", label: "Not allowed list", markdown: "**Not allowed:**\n\n- [Example]\n- [Example]\n" },
  { id: "allowed", label: "Allowed list", markdown: "**Allowed:**\n\n- [Example]\n- [Example]\n" },
  {
    id: "punish-table",
    label: "Punishment table",
    markdown: "| Offence | Punishment |\n| --- | --- |\n| 1st | [Warning] |\n| 2nd | [10 Points] |\n| 3rd | [Temporary ban] |\n",
  },
  { id: "staff-note", label: "Staff discretion note", markdown: "> [!NOTE]\n> Staff may adjust punishments based on context and history.\n" },
  { id: "warning", label: "Warning callout", markdown: "> [!WARNING]\n> [Something players must not miss.]\n" },
  { id: "definition", label: "Definition", markdown: "**[Term]** means [definition].\n" },
];

/* ----------------------------------------------------------------- guides */

const GUIDE_TEMPLATES: EntryTemplate[] = [
  {
    id: "guide-howto",
    name: "Step-by-step how-to",
    summary: "Numbered steps with tips.",
    values: {
      title: "How to [do the thing]",
      category: "Getting Started",
      excerpt: "[One sentence on what players will be able to do after reading.]",
      cover: "",
      slug: "",
      published: false,
      body: `## Before you start

- [Requirement, e.g. a driver's licence]
- [Item or money needed]

## Steps

1. Go to **[location]**. It's marked on your map as [icon].
2. Press \`kbd:E\` to [interact].
3. [Next step]
4. [Final step]

> [!TIP]
> [A shortcut or common mistake to avoid.]

## Need help?

Ask in **[#help channel]** or open a ticket on the [support page](/support).`,
    },
  },
  {
    id: "guide-job",
    name: "Job guide",
    summary: "How to start, earn and progress in a job.",
    values: {
      title: "[Job name] Guide",
      category: "Jobs & Careers",
      excerpt: "Everything you need to start working as a [job].",
      cover: "",
      slug: "",
      published: false,
      body: `## Overview

[What the job is and why it's fun.]

## Getting hired

1. Visit **[location]** or apply at [/applications](/applications).
2. [Requirement]

## How it works

1. Clock in at **[location]** with \`kbd:E\`.
2. [Do the work]
3. Get paid [per task / per hour].

## Pay and progression

| Rank | Pay | Unlocks |
| --- | --- | --- |
| [Trainee] | $[X] | [Basics] |
| [Senior] | $[X] | [More] |

> [!NOTE]
> [Anything players often ask about.]`,
    },
  },
  {
    id: "guide-keybinds",
    name: "Keybinds & commands",
    summary: "Tables of keys and chat commands.",
    values: {
      title: "Keybinds & Commands",
      category: "Keybinds & Commands",
      excerpt: "Every key and command you need in the city.",
      cover: "",
      slug: "keybinds-commands",
      published: false,
      body: `## Keybinds

| Key | Action |
| --- | --- |
| \`kbd:F1\` | [Phone] |
| \`kbd:TAB\` | [Inventory] |
| \`kbd:ALT\` | [Third eye / target] |
| \`kbd:M\` | [Radial menu] |

## Commands

| Command | What it does |
| --- | --- |
| \`/me [action]\` | Describe an action |
| \`/ooc [message]\` | Out-of-character chat |
| \`/report [message]\` | Contact staff |

> [!TIP]
> You can rebind most keys in **Settings → Key Bindings → FiveM**.`,
    },
  },
  {
    id: "guide-troubleshoot",
    name: "Troubleshooting",
    summary: "Problem → fix format for technical issues.",
    values: {
      title: "Fixing [problem]",
      category: "Technical/Troubleshooting",
      excerpt: "Quick fixes if [problem] happens to you.",
      cover: "",
      slug: "",
      published: false,
      body: `## Symptoms

- [What the player sees]

## Fix 1: Clear your FiveM cache

1. Close FiveM.
2. Press \`kbd:Win\` + \`kbd:R\` and open \`%localappdata%/FiveM/FiveM.app/data\`.
3. Delete the **cache**, **server-cache** and **server-cache-priv** folders.
4. Restart FiveM and reconnect.

## Fix 2: [Another fix]

1. [Step]

> [!WARNING]
> Don't delete the **game-storage** folder or you'll have to redownload GTA files.

Still stuck? Open a ticket on the [support page](/support) with a screenshot.`,
    },
  },
  {
    id: "guide-location",
    name: "Location / business",
    summary: "Where it is, what you can do there.",
    values: {
      title: "[Location name]",
      category: "Economy",
      excerpt: "What you can do at [location] and how to get there.",
      cover: "",
      slug: "",
      published: false,
      body: `## Where is it?

[Area of the map]. Look for the **[icon]** on your map.

## What you can do

- [Activity]
- [Activity]

## Opening hours

[Always open / when staffed by players]`,
    },
  },
];

const GUIDE_SNIPPETS: Snippet[] = [
  { id: "steps", label: "Numbered steps", markdown: "1. [Step]\n2. [Step]\n3. [Step]\n" },
  { id: "tip", label: "Tip callout", markdown: "> [!TIP]\n> [Helpful tip.]\n" },
  { id: "warning", label: "Warning callout", markdown: "> [!WARNING]\n> [Something to be careful of.]\n" },
  { id: "note", label: "Note callout", markdown: "> [!NOTE]\n> [Extra information.]\n" },
  { id: "keys", label: "Keybind table", markdown: "| Key | Action |\n| --- | --- |\n| `kbd:E` | [Interact] |\n| `kbd:F1` | [Phone] |\n" },
  { id: "commands", label: "Command table", markdown: "| Command | What it does |\n| --- | --- |\n| `/[command]` | [Description] |\n" },
  { id: "kbd", label: "Key", markdown: "`kbd:E`" },
  { id: "image", label: "Image", markdown: "![[Describe the image]](/images/guides/[file].png)\n" },
  { id: "section", label: "Section heading", markdown: "## [Heading]\n\n[Text]\n" },
];

/* -------------------------------------------------------------------- faq */

const FAQ_TEMPLATES: EntryTemplate[] = [
  {
    id: "faq-whitelist",
    name: "How do I get whitelisted?",
    summary: "Getting in",
    values: {
      question: "How do I get whitelisted?",
      category: "Getting in",
      slug: "how-do-i-get-whitelisted",
      answer: `1. Join our Discord and sign in on this website with Discord.
2. Fill out the [whitelist application](/applications).
3. Staff review applications within **[48 hours]**. You'll get a Discord message when it's decided.

Once approved, you'll receive the whitelist role automatically and can connect from the [Play page](/queue).`,
    },
  },
  {
    id: "faq-queue",
    name: "How does the queue work?",
    summary: "Getting in",
    values: {
      question: "How does the queue work?",
      category: "Getting in",
      slug: "how-does-the-queue-work",
      answer: `When the city is full you join a queue. Your place depends on your **queue priority**: your highest priority Discord role, your supporter tier, and any bonus from staff. You can see your priority on your [profile](/profile).

If you crash, you keep your place for a few minutes.`,
    },
  },
  {
    id: "faq-cant-connect",
    name: "I can't connect",
    summary: "Technical",
    values: {
      question: "I can't connect. What should I do?",
      category: "Technical",
      slug: "i-cant-connect",
      answer: `- Make sure **Discord is open** before you launch FiveM.
- Check you're whitelisted on the [Play page](/queue).
- Clear your FiveM cache and restart.

Still stuck? Open a ticket on the [support page](/support).`,
    },
  },
  {
    id: "faq-appeal",
    name: "How do I appeal a ban?",
    summary: "Staff & support",
    values: {
      question: "How do I appeal a ban?",
      category: "Staff & support",
      slug: "how-do-i-appeal-a-ban",
      answer: `Submit a ban appeal from the [support page](/support). Be honest and explain what happened. Appeals are usually answered within **[X days]**. Don't make a new account; alts are linked and banned too.`,
    },
  },
  {
    id: "faq-support",
    name: "How do I support the server?",
    summary: "Supporting",
    values: {
      question: "How can I support the server?",
      category: "Supporting",
      slug: "how-can-i-support-the-server",
      answer: `You can buy a supporter tier from our store. Tiers give queue priority and cosmetic perks, never an in-city advantage. See the tiers on the [home page](/#tiers-title).`,
    },
  },
  {
    id: "faq-blank",
    name: "Blank question",
    summary: "Any category",
    values: { question: "[Question?]", category: "[Category]", slug: "", answer: "[Short, direct answer.]\n\n- [Detail]\n" },
  },
];

const FAQ_SNIPPETS: Snippet[] = [
  { id: "steps", label: "Steps", markdown: "1. [Step]\n2. [Step]\n" },
  { id: "bullets", label: "Bullet list", markdown: "- [Point]\n- [Point]\n" },
  { id: "link-support", label: "Support link", markdown: "Open a ticket on the [support page](/support)." },
  { id: "link-apply", label: "Apply link", markdown: "[Apply here](/applications)." },
  { id: "tip", label: "Tip callout", markdown: "> [!TIP]\n> [Helpful tip.]\n" },
];

export const ENTRY_TEMPLATES: Record<TemplateKind, EntryTemplate[]> = { rules: RULE_TEMPLATES, guides: GUIDE_TEMPLATES, faq: FAQ_TEMPLATES };
export const SNIPPETS: Record<TemplateKind, Snippet[]> = { rules: RULE_SNIPPETS, guides: GUIDE_SNIPPETS, faq: FAQ_SNIPPETS };

export function hasTemplates(kind: string): kind is TemplateKind {
  return kind === "rules" || kind === "guides" || kind === "faq";
}

/** Insert `snippet` into `text` at [start, end), padding with blank lines when it's a block. */
export function insertSnippet(text: string, snippet: string, start: number, end: number) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const block = snippet.includes("\n");
  const lead = !block || before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = !block || after === "" ? "" : after.startsWith("\n") ? "" : "\n";
  const inserted = lead + snippet + trail;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}
