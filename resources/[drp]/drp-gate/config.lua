Config = {}

-- Website ------------------------------------------------------------------
-- Base URL of the website, no trailing slash.
Config.ApiUrl = GetConvar('drp_gate_api', 'https://dreamrp.example.com')
-- Must match FIVEM_API_SECRET on the website. Set it in server.cfg, not here:
--   set drp_gate_secret "long-random-string"
Config.ApiSecret = GetConvar('drp_gate_secret', '')
-- How long to wait for /api/fivem/check before falling back to the cached allowlist.
Config.CheckTimeoutMs = 5000
-- How often to refresh the cached allowlist + ban list (fallback for website outages).
Config.CacheRefreshMs = 5 * 60 * 1000
-- How often to send the heartbeat (online players + queue) to the website.
Config.HeartbeatMs = 30 * 1000

-- Queue --------------------------------------------------------------------
-- Slots kept free for staff. Non-staff can fill at most (sv_maxclients - ReservedStaffSlots).
Config.ReservedStaffSlots = 2
-- Players who crash (or drop out of the queue) get their place back if they reconnect within this time.
Config.GraceMs = 3 * 60 * 1000
-- How often the deferral card refreshes.
Config.CardUpdateMs = 2000
-- Seconds a player may take to finish loading after being let in before the slot is freed.
Config.ConnectingTimeoutMs = 3 * 60 * 1000

-- Branding (adaptive card) --------------------------------------------------
Config.ServerName = 'Dream RP'
Config.LogoUrl = Config.ApiUrl .. '/icon.svg'
Config.DiscordUrl = GetConvar('drp_gate_discord', 'https://discord.gg/your-invite')
Config.WebsiteUrl = Config.ApiUrl
-- Adaptive cards only support named colours: default, accent, good, warning, attention.
Config.CardColors = { title = 'default', position = 'attention', priority = 'accent', muted = 'default' }

-- Optional: report each player's Qbox/QBCore characters to their website profile.
-- Requires oxmysql. Reads the `players` table (citizenid, charinfo, money, job, gang, last_updated)
-- for the profile's Characters section; the active character comes from qbx_core / qb-core.
Config.ReportCharacters = true
-- How often (ms) online players' characters (money, job) are re-sent to the website.
Config.CharacterRefreshMs = 5 * 60 * 1000

-- Messages -------------------------------------------------------------------
Config.Messages = {
    checking = 'Checking the city…',
    noDiscord = 'Open Discord and restart FiveM so we can verify you.',
    notWhitelisted = 'Not whitelisted. Apply at %s/applications',
    siteDown = 'We couldn\'t reach the website to verify you. Please try again in a minute.',
    banned = 'You are banned: %s (%s). Appeal at %s/support',
    kicked = 'You were removed from the queue: %s',
    letIn = 'Welcome to the city.',
}

Config.Debug = false
