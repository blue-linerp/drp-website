# Dream RP website

The marketing site and player portal for **Dream RP**, plus the `drp-gate` FiveM resource. The website and the city share one source of truth for whitelist, bans and queue priority.

- **Public site:** home, applications, rules, guides, FAQ, creators (live Twitch), Play/queue status, support, and legal pages.
- **Player portal:** Discord sign-in, profile, application history, whitelist status, a queue priority breakdown, linked FiveM identifiers, characters, playtime, and the player's own warnings and bans.
- **Staff dashboard** (`/admin`): application review, the application builder, whitelist manager, queue manager, bans and warnings, content CMS, site settings and an audit log. Access is gated by Discord roles.
- **`drp-gate` resource:** deferral checks, an adaptive-card priority queue, a crash grace period, a heartbeat, and an offline fallback cache.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Auth.js v5 (Discord) · PostgreSQL + Prisma · Zod · Vitest · Playwright.

---

## 1. Quick start (local)

```bash
npm install
cp .env.example .env          # set AUTH_SECRET at minimum
npm run db:local              # terminal 1: local Postgres on :5433 (no Docker needed)
npm run db:migrate            # terminal 2
npm run db:seed               # tiers, 8 application types, rules, guides, FAQ
npm run dev                   # http://localhost:3000
```

`npm run db:local` starts an embedded PostgreSQL in `.local-db/`, so you don't need Docker or a system install. Set `DATABASE_URL=postgresql://drp:drp@localhost:5433/drp`. For production, use a real Postgres (Neon, Supabase, Railway, or your VPS).

The seed only creates content on the **first run**. After that, rules, guides and FAQ are edited in **Admin → Content**. To re-import `/content/*.md` over existing rows, run `SEED_FORCE=1 npm run db:seed`.

---

## 2. Discord application and bot

1. Go to <https://discord.com/developers/applications> → **New Application** ("Dream RP").
2. **OAuth2**
   - Copy the **Client ID** and **Client Secret** into `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.
   - Add the redirect `https://YOUR_DOMAIN/api/auth/callback/discord`, plus `http://localhost:3000/api/auth/callback/discord` for local development.
   - The site requests the scopes `identify guilds guilds.members.read`. The OAuth token is only used during sign-in and is never stored.
3. **Bot**
   - **Reset Token** → `DISCORD_BOT_TOKEN`.
   - Turn on the **Server Members Intent** (privileged).
   - Invite the bot: OAuth2 → URL Generator → scope `bot`, permissions **Manage Roles**. The bot only uses REST, so it needs no gateway connection.
   - In **Server Settings → Roles**, drag the bot's role **above** every role it should grant: Whitelisted, the department roles and the supporter tier roles.
4. Turn on Developer Mode in Discord (Settings → Advanced), then right-click to copy these IDs:
   - Server → `DISCORD_GUILD_ID`
   - The Whitelisted role → `WHITELIST_ROLE_ID`
   - Admin, senior staff and staff roles → `ADMIN_ROLE_IDS`, `SENIOR_STAFF_ROLE_IDS`, `STAFF_ROLE_IDS` (comma-separated)
   - Department heads → `DEPT_HEAD_ROLE_IDS="police:ROLEID,ems:ROLEID,doj:ROLEID"`
5. Webhooks (Channel → Integrations → Webhooks):
   - Staff review channel → `APP_WEBHOOK_URL`
   - Log channel → `LOG_WEBHOOK_URL`

### Permissions

| Level | From | Can |
| --- | --- | --- |
| `ADMIN` | `ADMIN_ROLE_IDS` | Everything, including the app builder, announcement and maintenance banners |
| `SENIOR_STAFF` | `SENIOR_STAFF_ROLE_IDS` | Applications, whitelist, queue, bans, content, audit log |
| `STAFF` | `STAFF_ROLE_IDS` | Review applications, view users |
| `DEPT_HEAD` | `DEPT_HEAD_ROLE_IDS` | Review applications for their own department only |

Every page and API route checks these on the server. Roles are re-read from Discord when they're more than 5 minutes old.

### How whitelist sync works

A player is whitelisted when `User.whitelisted = true` **and** they have `WHITELIST_ROLE_ID` in the guild. The two are kept in sync:

- Accepting a whitelist application, or granting whitelist in admin, adds the Discord role first and then sets the database flag.
- Removing whitelist in admin removes the role and clears the flag.
- If someone adds the role by hand in Discord, the next sync grants whitelist. If someone removes the role, or the player leaves the server, the next sync revokes it.
- Syncs run at sign-in, whenever `/api/me` or the FiveM check sees roles older than 5 minutes, and from the `/api/cron/sync` job every 15 minutes.

---

## 3. Environment

Every variable is documented in [`.env.example`](.env.example). The minimum to deploy:

`DATABASE_URL, AUTH_SECRET, AUTH_URL, NEXT_PUBLIC_SITE_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, WHITELIST_ROLE_ID, ADMIN_ROLE_IDS, FIVEM_API_SECRET, NEXT_PUBLIC_CFX_JOIN_CODE, NEXT_PUBLIC_DISCORD_INVITE`

Optional:

- Twitch (`TWITCH_CLIENT_ID/SECRET`, from <https://dev.twitch.tv/console>) powers the "Live from the city" sections.
- `YOUTUBE_API_KEY` is optional. Without it, the site reads each channel's public RSS feed.
- `TEBEX_WEBHOOK_SECRET` handles supporter tiers.
- `UPSTASH_REDIS_*` gives shared rate limiting on serverless hosts.
- `CRON_SECRET` protects the sync job.

---

## 4. Deploy

### Vercel

1. Push the repo, then import it in Vercel.
2. Add every environment variable from section 3.
3. Run the migrations against production once: `DATABASE_URL=... npx prisma migrate deploy && npm run db:seed`.
4. Deploy. The build pre-renders the content pages from the database, so the database must be reachable during the build.
5. `vercel.json` runs `/api/cron/sync` once a day (the free Hobby plan only allows daily crons). Roles also re-sync whenever a player loads their profile or connects in game, so daily is enough. On a paid plan you can change it to `*/15 * * * *`. Set `CRON_SECRET`; Vercel sends it automatically.

### Docker / VPS

```bash
docker build --build-arg DATABASE_URL="postgresql://..." -t drp-website .
docker run -d --env-file .env -p 3000:3000 --name drp-website drp-website
```

The container applies pending migrations on start. Put it behind a reverse proxy (Caddy or nginx) with HTTPS.

---

## 5. FiveM resource (`drp-gate`)

1. Copy `resources/[drp]` into your server's `resources/` folder.
2. In `server.cfg`, ensure it **after** oxmysql (optional) and **before** your framework:

   ```cfg
   set drp_gate_api "https://YOUR_DOMAIN"
   set drp_gate_secret "same value as FIVEM_API_SECRET"
   set drp_gate_discord "https://discord.gg/your-invite"
   ensure oxmysql
   ensure drp-gate
   ensure qbx_core
   ```

3. **Remove any other whitelist or queue resource** (for example connectqueue). Two queues will fight over `playerConnecting`.
4. Optional: set `FIVEM_ALLOWED_IPS` on the website to your game server's public IP.
5. Edit `resources/[drp]/drp-gate/config.lua` for the reserved staff slots (default 2), the grace period (3 minutes), messages and card colours.

### What happens when a player connects

1. The resource reads the `license`, `discord`, `steam` and `fivem` identifiers. With no Discord identifier, the player sees: *"Open Discord and restart FiveM so we can verify you."*
2. It calls `POST /api/fivem/check` with a 5-second timeout. The website:
   - links the identifiers to the user on first connect,
   - checks bans against every linked identifier (this catches alts),
   - checks guild membership and whitelist,
   - returns the player's priority.
3. If the website can't be reached, the resource uses its cached allowlist and ban list. These refresh every 5 minutes and are saved to `cache.json`, so they survive a server restart.
4. Allowed players join the priority queue. The order is crash grace first, then `priority` descending, then join time. Priority is `0 + highest queue role + supporter tier (25/40/80/120) + STAFF_PRIORITY_BONUS for staff + the manual bonus`. Only whitelisted players can queue at all; the whitelist role is re-read from Discord at connect if it's more than a minute old.
5. While they wait, an adaptive card updates every 2 seconds. It shows their position, priority, tier, time waited, player count, and Discord/Website buttons.
6. Players are let in while `online + still loading < sv_maxclients - ReservedStaffSlots`. Staff, and queue roles marked "Can use reserved slots", can use the reserved slots.

**Queue roles** (Admin → Queue → Queue roles, needs `queue.manage`): pick a Discord role (the bot lists your server's roles), give it a label and priority points, and optionally let it use reserved slots. A player gets the points of their **highest** queue role only; roles don't stack. Changes apply to new connections right away and to players already queued at the next heartbeat (≤30s). The Play page lists the roles and points publicly.
7. Players who crash keep their place for 3 minutes, or jump to the front if they crashed while in the city.
8. Every 30 seconds the resource sends a heartbeat with online players and the queue. The website uses it for queue length, each player's live position on `/queue`, playtime and last seen. The response tells the resource to:
   - kick anyone staff removed from the queue,
   - drop players who were just banned,
   - update queued players' priorities.
9. Optional (`Config.ReportCharacters`, needs oxmysql): the resource reads each player's Qbox/QBCore characters from the `players` table (name, job and grade, duty, gang, cash, bank, phone, birthdate) a minute after they join, every 5 minutes while they're online, and after they leave. Heartbeats include the active character (from `qbx_core` / `qb-core`), so the site tracks play time and last connected per character. Players see everything on their profile; public profiles show names and jobs only.

Server console command: `drpqueue` prints the current queue.

---

## 6. Tebex (supporter tiers)

1. In **Admin → Content → Supporter tiers**, enter each tier's **Tebex package ID**, checkout URL and Discord role ID. The seed also reads these from the `TEBEX_*` and `*_ROLE_ID` variables.
2. In Tebex → Webhooks, add `https://YOUR_DOMAIN/api/webhooks/tebex` and subscribe to these events:
   - `payment.completed`
   - `recurring-payment.started`
   - `recurring-payment.renewed`
   - `recurring-payment.ended`
   - `payment.refunded`
   - `payment.dispute.opened`

   Copy the webhook secret into `TEBEX_WEBHOOK_SECRET`. The validation ping is answered automatically.
3. Purchases are matched to players through the store login: a Discord ID (stores with Discord login) or a Cfx.re ID (FiveM login). The Cfx.re ID is linked the first time a player connects in game. Unmatched purchases are posted to the log channel.
4. The tier sets queue priority and the matching Discord role. When it ends, is refunded or is disputed, both are removed. The cron job also expires tiers that pass their paid-until date.

Supporter perks are cosmetic or convenience only, and the site says so. Check that your packages follow the [Cfx.re monetisation rules](https://fivem.net/terms).

### Linking Steam and Cfx.re (profile)

Players can link their accounts from **Profile → Linked accounts**:

- **Steam** uses Steam's OpenID sign-in. The site checks the result directly with Steam and stores the `steam:<hex>` identifier FiveM reports. Set `STEAM_API_KEY` (optional) to also show the Steam name.
- **Cfx.re / FiveM** uses the Cfx.re forum's user API key flow (the same one txAdmin uses), with the `session_info` scope only. It stores `fivem:<id>`, which is also how Tebex purchases made with a FiveM login get matched. The key is revoked right after the forum user is read.
- An account that's already linked to another profile is refused, and links and unlinks show up in the audit log. The Rockstar licence can only be linked in game, the first time the player connects.

No extra setup is needed. Both providers redirect back to `NEXT_PUBLIC_SITE_URL`, so keep it set to the public URL players actually use.

---

## 7. Running the city day to day

| Task | Where |
| --- | --- |
| Review applications | Admin → Applications. Filter, claim, note, interview, accept or deny. Accepting grants the role and whitelist and DMs the player. |
| Open or close an application, edit questions | Admin → App builder. Drag-and-drop questions in 11 field types. Questions with the same "section" become one step. |
| Whitelist someone manually, or bulk import | Admin → Users & whitelist |
| Give someone queue priority, or kick them from the queue | The user's page, or Admin → Queue |
| Ban or warn (by Discord ID) | Admin → Bans & warnings, or the user's page |
| Edit rules, guides, FAQ, tiers, creators | Admin → Content. Markdown editor with preview, drag to reorder. Public pages update when you save. |
| Announcement bar, maintenance banner, home copy and images, rules changelog, pinned videos | Admin → Site settings |
| Who did what | Admin → Audit log |

Guide Markdown extras:

- Callouts: `> [!TIP]`, `> [!WARNING]`, `> [!NOTE]`
- Keyboard chips: `` `kbd:F1` ``

Creators appear under "Live from the city" when they're live on Twitch playing GTA V **and** their stream title contains one of `TWITCH_SERVER_TAGS`.

---

## 8. Tests

```bash
npm test             # Vitest: priority, gating, status transitions, form validation, permissions, Tebex
npm run test:e2e     # Playwright: sign in → apply → admin accept → whitelisted → FiveM check + queue
```

The end-to-end test builds into `.next-e2e`, so it can run alongside `npm run dev`. It serves on port 3100 against `DATABASE_URL`, which defaults to the local database from `npm run db:local`. Run `npx playwright install chromium` once first.

The test signs in through a **test-only provider** that exists only when `AUTH_TEST_LOGIN_SECRET` is set. **Never set that variable in production.**

---

## 9. Project layout

```
app/(marketing)     public pages: home, applications, rules, guides, faq, creators, queue, support, legal, sign in/out
app/(portal)        /profile and the read-only application view
app/admin           staff dashboard
app/api             public, authenticated, admin, FiveM and webhook routes
components          UI (HUD-style chamfered plates, liquid-glass header), page sections, admin tools
lib                 domain logic: priority, gating, status machine, questions, Discord, sync, FiveM, Tebex
content             seed Markdown (rules, FAQ, guides, legal pages)
prisma              schema, migrations, seed
resources/[drp]     drp-gate FiveM resource
public/images       image slots (see public/images/README.md)
```

Design tokens come from `drp-hud`: the `#FF243A` accent, graphite plates, and top-left and bottom-right chamfers. The fonts match `dream_loadscreen`: Chakra Petch, Barlow Semi Condensed, Barlow and JetBrains Mono.

*Dream RP is not affiliated with Rockstar Games, Take-Two Interactive or Cfx.re.*
