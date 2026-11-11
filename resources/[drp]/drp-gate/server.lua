-- drp-gate: whitelist, bans and a priority queue backed by the Dream RP website.
-- Every decision comes from POST /api/fivem/check, so the site and the city share one source of truth.

local queue = {}        -- array of entries (see newEntry)
local grace = {}        -- license -> { joinedAt, expires, crashed }
local connecting = {}   -- license -> ms timestamp when let in (still loading)
local cache = { players = {}, bans = {}, at = 0 } -- fallback allowlist / bans
local cardTemplate = LoadResourceFile(GetCurrentResourceName(), 'card.json')
local CACHE_FILE = 'cache.json'

local function log(...)
    if Config.Debug then print('[drp-gate]', ...) end
end

local function now() return GetGameTimer() end

--------------------------------------------------------------------------------
-- HTTP
--------------------------------------------------------------------------------
--- Request with a hard timeout. cb(status, data|nil). status 0 = timed out / unreachable.
local function api(method, path, body, timeoutMs, cb)
    local done = false
    PerformHttpRequest(Config.ApiUrl .. path, function(status, text)
        if done then return end
        done = true
        local ok, data = pcall(json.decode, text or '')
        cb(status, ok and data or nil)
    end, method, body and json.encode(body) or '', {
        ['Content-Type'] = 'application/json',
        ['x-api-key'] = Config.ApiSecret,
    })
    SetTimeout(timeoutMs or 10000, function()
        if done then return end
        done = true
        cb(0, nil)
    end)
end

--- Blocking wrapper for use inside threads/deferrals.
local function apiAwait(method, path, body, timeoutMs)
    local p = promise.new()
    api(method, path, body, timeoutMs, function(status, data) p:resolve({ status = status, data = data }) end)
    local r = Citizen.Await(p)
    return r.status, r.data
end

--------------------------------------------------------------------------------
-- Identifiers
--------------------------------------------------------------------------------
local function identifiers(src)
    local ids = { license = nil, license2 = nil, discord = nil, steam = nil, fivem = nil, ip = nil }
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        local kind = id:match('^(%w+):')
        if kind == 'license' then ids.license = id
        elseif kind == 'license2' then ids.license2 = id
        elseif kind == 'discord' then ids.discord = id:sub(9)
        elseif kind == 'steam' then ids.steam = id
        elseif kind == 'fivem' then ids.fivem = id
        elseif kind == 'ip' then ids.ip = id:sub(4)
        end
    end
    if not ids.license and ids.license2 then ids.license = 'license:' .. ids.license2:sub(10) end
    return ids
end

--------------------------------------------------------------------------------
-- Fallback cache (allowlist + bans), refreshed every Config.CacheRefreshMs
--------------------------------------------------------------------------------
local function saveCache()
    SaveResourceFile(GetCurrentResourceName(), CACHE_FILE, json.encode(cache), -1)
end

local function loadCache()
    local raw = LoadResourceFile(GetCurrentResourceName(), CACHE_FILE)
    if raw then
        local ok, data = pcall(json.decode, raw)
        if ok and data then cache = data end
    end
end

local function refreshCache()
    local s1, allow = apiAwait('GET', '/api/fivem/allowlist', nil, 10000)
    local s2, bans = apiAwait('GET', '/api/fivem/bans', nil, 10000)
    if s1 == 200 and allow and s2 == 200 and bans then
        cache = { players = allow.players or {}, bans = bans.bans or {}, at = os.time() }
        saveCache()
        log(('cache refreshed: %d players, %d bans'):format(#cache.players, #cache.bans))
    else
        print(('[drp-gate] cache refresh failed (allowlist %s, bans %s). Using cache from %s.'):format(s1, s2, cache.at > 0 and os.date('%c', cache.at) or 'never'))
    end
end

local function cachedDecision(ids)
    local t = os.time()
    for _, b in ipairs(cache.bans) do
        if (not b.expiresAt or b.expiresAt > t) and ((ids.license and b.license == ids.license) or (ids.discord and b.discordId == ids.discord) or (ids.steam and b.steam == ids.steam)) then
            return { allowed = false, banned = true, banReason = b.reason, banExpires = b.expiresAt, priority = 0 }
        end
    end
    for _, p in ipairs(cache.players) do
        if (ids.discord and p.discordId == ids.discord) or (ids.license and p.license == ids.license) then
            return { allowed = true, priority = p.priority or 0, displayName = p.name, tier = nil, isStaff = false, reserved = p.reserved == true }
        end
    end
    return nil
end

--------------------------------------------------------------------------------
-- Queue
--------------------------------------------------------------------------------
local function sortQueue()
    table.sort(queue, function(a, b)
        if a.grace ~= b.grace then return a.grace end -- crashed players go first
        if a.priority ~= b.priority then return a.priority > b.priority end
        return a.joinedAt < b.joinedAt
    end)
end

local function findEntry(license)
    for i, e in ipairs(queue) do
        if e.license == license then return i, e end
    end
end

local function removeEntry(license)
    local i = findEntry(license)
    if i then table.remove(queue, i) end
end

local function onlineCount()
    return #GetPlayers()
end

local function connectingCount()
    local n, t = 0, now()
    for license, at in pairs(connecting) do
        if t - at > Config.ConnectingTimeoutMs then connecting[license] = nil else n = n + 1 end
    end
    return n
end

local function fmtElapsed(ms)
    local s = math.floor(ms / 1000)
    return ('%d:%02d'):format(math.floor(s / 60), s % 60)
end

local function jsonEscape(s)
    return (tostring(s):gsub('[%c"\\]', function(c)
        return ({ ['"'] = '\\"', ['\\'] = '\\\\', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' })[c] or ''
    end))
end

local function renderCard(entry, position, total)
    local max = GetConvarInt('sv_maxclients', 48)
    local values = {
        logo = Config.LogoUrl,
        server = Config.ServerName,
        subtitle = entry.displayName and ('Welcome back, ' .. entry.displayName) or 'Getting you into the city',
        position = position,
        total = total,
        priority = entry.priority,
        tier = (entry.queueRole and entry.tier and (entry.queueRole .. ' · ' .. entry.tier)) or entry.queueRole or entry.tier or 'None',
        elapsed = fmtElapsed(now() - entry.joinedAt),
        players = ('%d / %d'):format(onlineCount(), max),
        note = entry.grace and 'You crashed recently, so your place has been kept.' or 'Keep this window open. You\'ll join automatically when a slot opens.',
        discord = Config.DiscordUrl,
        website = Config.WebsiteUrl,
        c_title = Config.CardColors.title,
        c_position = Config.CardColors.position,
    }
    return (cardTemplate:gsub('{{(%w+_?%w*)}}', function(k)
        local v = values[k]
        return v ~= nil and jsonEscape(v) or ''
    end))
end

--- A connecting player whose game closed shows up as nil name / endpoint.
local function stillConnected(src)
    return GetPlayerName(src) ~= nil and GetPlayerEndpoint(src) ~= nil
end

-- Main queue loop: admit players when slots open, refresh cards, drop lost entries.
CreateThread(function()
    local lastCard = 0
    while true do
        Wait(500)
        local t = now()

        -- Lost connections keep their place for the grace period.
        for i = #queue, 1, -1 do
            local e = queue[i]
            if not stillConnected(e.src) then
                grace[e.license] = { joinedAt = e.joinedAt, expires = t + Config.GraceMs, crashed = e.grace }
                table.remove(queue, i)
                log('lost from queue', e.license)
            end
        end
        for license, g in pairs(grace) do
            if t > g.expires then grace[license] = nil end
        end

        sortQueue()
        local max = GetConvarInt('sv_maxclients', 48)
        local used = onlineCount() + connectingCount()
        local i = 1
        while i <= #queue do
            local e = queue[i]
            -- Staff and queue roles flagged "reserved slots" on the website may use the held-back slots.
            local cap = (e.isStaff or e.reserved) and max or (max - Config.ReservedStaffSlots)
            if used < cap then
                table.remove(queue, i)
                connecting[e.license] = t
                used = used + 1
                log('admitting', e.license)
                e.deferrals.done()
            else
                i = i + 1
            end
        end

        if t - lastCard >= Config.CardUpdateMs then
            lastCard = t
            for pos, e in ipairs(queue) do
                e.deferrals.presentCard(renderCard(e, pos, #queue))
            end
        end
    end
end)

--------------------------------------------------------------------------------
-- Connecting
--------------------------------------------------------------------------------
local function banText(reason, expires)
    local until_ = expires and (type(expires) == 'number' and os.date('!%Y-%m-%d %H:%M UTC', expires) or tostring(expires)) or 'permanent'
    return Config.Messages.banned:format(reason or 'No reason given', until_, Config.ApiUrl)
end

AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    local src = source
    deferrals.defer()
    Wait(0)
    deferrals.update(Config.Messages.checking)

    local ids = identifiers(src)
    if not ids.license then
        deferrals.done('Could not read your Rockstar licence. Restart FiveM and try again.')
        return
    end
    if not ids.discord then
        deferrals.done(Config.Messages.noDiscord)
        return
    end

    local status, res = apiAwait('POST', '/api/fivem/check', {
        license = ids.license, discordId = ids.discord, steam = ids.steam, fivem = ids.fivem, ip = ids.ip, name = name,
    }, Config.CheckTimeoutMs)

    if status ~= 200 or not res then
        print(('[drp-gate] check failed (%s) for %s, using cached allowlist'):format(status, ids.license))
        res = cachedDecision(ids)
        if not res then
            deferrals.done(status == 0 and Config.Messages.siteDown or Config.Messages.notWhitelisted:format(Config.ApiUrl))
            return
        end
    end

    if res.banned then
        deferrals.done(banText(res.banReason, res.banExpires))
        return
    end
    if not res.allowed then
        deferrals.done(res.message or Config.Messages.notWhitelisted:format(Config.ApiUrl))
        return
    end

    -- Already queued from another attempt: replace the old deferral, keep the spot.
    local _, existing = findEntry(ids.license)
    local g = grace[ids.license]
    local entry = {
        src = src,
        license = ids.license,
        discordId = ids.discord,
        name = name,
        displayName = res.displayName,
        priority = tonumber(res.priority) or 0,
        tier = res.tier,
        isStaff = res.isStaff == true,
        reserved = res.reserved == true,
        queueRole = type(res.queueRole) == 'string' and res.queueRole or nil,
        joinedAt = (existing and existing.joinedAt) or (g and g.joinedAt) or now(),
        grace = (g and g.crashed) or false,
        deferrals = deferrals,
    }
    if existing then removeEntry(ids.license) end
    grace[ids.license] = nil
    queue[#queue + 1] = entry
    sortQueue()
    log(('queued %s prio=%d staff=%s reserved=%s role=%s'):format(ids.license, entry.priority, tostring(entry.isStaff), tostring(entry.reserved), tostring(entry.queueRole)))
end)

-- Fully joined: free the "connecting" slot.
AddEventHandler('playerJoining', function()
    local ids = identifiers(source)
    if ids.license then connecting[ids.license] = nil end
end)

-- Crashes/timeouts in game: let them back in ahead of the queue for Config.GraceMs.
AddEventHandler('playerDropped', function(reason)
    local ids = identifiers(source)
    if not ids.license then return end
    connecting[ids.license] = nil
    local r = (reason or ''):lower()
    local crashed = r:find('crash') or r:find('timed out') or r:find('connection') or r:find('game crashed')
    if crashed then
        grace[ids.license] = { joinedAt = 0, expires = now() + Config.GraceMs, crashed = true }
        log('grace (crash)', ids.license)
    end
end)

--------------------------------------------------------------------------------
-- Heartbeat: online players + queue snapshot → website; commands ← website
--------------------------------------------------------------------------------
local function playerByLicense(license)
    for _, p in ipairs(GetPlayers()) do
        if identifiers(p).license == license then return p end
    end
end

--- citizenid of the character a player is currently on (Qbox / QBCore), or nil.
local function activeCitizenId(src)
    local ok, cid = pcall(function()
        if GetResourceState('qbx_core') == 'started' then
            local p = exports.qbx_core:GetPlayer(tonumber(src))
            return p and p.PlayerData and p.PlayerData.citizenid
        elseif GetResourceState('qb-core') == 'started' then
            local core = exports['qb-core']:GetCoreObject()
            local p = core and core.Functions.GetPlayer(tonumber(src))
            return p and p.PlayerData and p.PlayerData.citizenid
        end
    end)
    return ok and cid or nil
end

-- An unloading character can remain in framework memory briefly. Hide it until the next load.
local characterUnloaded = {}
local function heartbeat()
    local players = {}
    for _, p in ipairs(GetPlayers()) do
        local ids = identifiers(p)
        if ids.license then
            if characterUnloaded[tostring(p)] ~= 'dropped' then
                players[#players + 1] = { license = ids.license, discordId = ids.discord, name = GetPlayerName(p), citizenid = not characterUnloaded[tostring(p)] and activeCitizenId(p) or nil }
            end
        end
    end
    local q = {}
    local t, epoch = now(), os.time() * 1000
    for _, e in ipairs(queue) do
        q[#q + 1] = { license = e.license, discordId = e.discordId, name = e.name, priority = e.priority, tier = e.tier, joinedAt = epoch - (t - e.joinedAt) }
    end

    local status, res = apiAwait('POST', '/api/fivem/heartbeat', { players = players, queue = q, maxClients = GetConvarInt('sv_maxclients', 48) }, 10000)
    if status ~= 200 or not res then
        log('heartbeat failed', status)
        return
    end

    for _, k in ipairs(res.kicks or {}) do
        local _, e = findEntry(k.license)
        if e then
            removeEntry(k.license)
            e.deferrals.done(Config.Messages.kicked:format(k.reason or 'staff decision'))
        end
    end
    for _, d in ipairs(res.drops or {}) do
        local _, e = findEntry(d.license)
        if e then
            removeEntry(d.license)
            e.deferrals.done(d.reason)
        end
        local p = playerByLicense(d.license)
        if p then DropPlayer(p, d.reason) end
    end
    for license, prio in pairs(res.priorities or {}) do
        local _, e = findEntry(license)
        if e then e.priority = prio end
    end
end

-- Serialize snapshots so a slower earlier request cannot restore an old online status.
local heartbeatRunning, heartbeatPending = false, false
local function scheduleHeartbeat()
    if heartbeatRunning then heartbeatPending = true return end
    heartbeatRunning = true
    CreateThread(function()
        repeat
            heartbeatPending = false
            local ok, err = pcall(heartbeat)
            if not ok then print(('[drp-gate] heartbeat failed: %s'):format(tostring(err))) end
        until not heartbeatPending
        heartbeatRunning = false
    end)
end

AddEventHandler('playerJoining', function() characterUnloaded[tostring(source)] = nil end)
AddEventHandler('playerDropped', function()
    characterUnloaded[tostring(source)] = 'dropped'
    scheduleHeartbeat()
end)
AddEventHandler('QBCore:Server:OnPlayerUnload', function(src)
    if not src then return end
    characterUnloaded[tostring(src)] = true
    scheduleHeartbeat()
end)

CreateThread(function()
    if Config.ApiSecret == '' then
        print('^1[drp-gate] drp_gate_secret is not set. Every connection will fail. Add `set drp_gate_secret "..."` to server.cfg.^0')
    end
    loadCache()
    refreshCache()
    local lastCache = now()
    while true do
        Wait(Config.HeartbeatMs)
        scheduleHeartbeat()
        if now() - lastCache >= Config.CacheRefreshMs then
            lastCache = now()
            refreshCache()
        end
    end
end)

--------------------------------------------------------------------------------
-- Optional: report characters (Qbox / QBCore `players` table via oxmysql)
--------------------------------------------------------------------------------
local function decode(s)
    if type(s) == 'table' then return s end
    local ok, v = pcall(json.decode, s or '{}')
    return (ok and type(v) == 'table') and v or {}
end

local function gradeName(g)
    if type(g) == 'table' then return g.name or (g.level and tostring(g.level)) end
    return g and tostring(g) or nil
end

local function toCharacter(r)
    local info, money, job, gang = decode(r.charinfo), decode(r.money), decode(r.job), decode(r.gang)
    local gender = info.gender
    if gender == 0 or gender == '0' then gender = 'Male' elseif gender == 1 or gender == '1' then gender = 'Female' end
    return {
        citizenid = r.citizenid,
        firstname = info.firstname or '',
        lastname = info.lastname or '',
        birthdate = info.birthdate and tostring(info.birthdate) or nil,
        gender = gender and tostring(gender) or nil,
        nationality = info.nationality,
        phone = info.phone and tostring(info.phone) or nil,
        jobName = job.name,
        jobLabel = job.label or job.name,
        jobGrade = gradeName(job.grade),
        onDuty = job.onduty == true,
        gangName = (gang.name and gang.name ~= 'none') and gang.name or nil,
        gangLabel = (gang.name and gang.name ~= 'none') and (gang.label or gang.name) or nil,
        gangGrade = (gang.name and gang.name ~= 'none') and gradeName(gang.grade) or nil,
        cash = tonumber(money.cash) or 0,
        bank = tonumber(money.bank) or 0,
        lastUpdated = r.last_updated,
    }
end

-- Only one report per licence is in flight: an older HTTP response cannot overwrite a newer snapshot.
local reporting, pending = {}, {}
-- Persist confirmed deletions until the website acknowledges them, including across restarts.
local deletedCharacters = decode(GetResourceKvpString('drp_gate_deleted_characters'))
local function saveDeletedCharacters()
    SetResourceKvp('drp_gate_deleted_characters', json.encode(deletedCharacters))
end

local function queueDeletedCharacter(citizenid)
    if type(citizenid) ~= 'string' or citizenid == '' then return end
    deletedCharacters[citizenid] = true
    saveDeletedCharacters()
end
AddEventHandler('qbx_core:server:characterDeleted', queueDeletedCharacter)
AddEventHandler('ryn-multichar:server:characterDeleted', function(_, citizenid)
    queueDeletedCharacter(citizenid)
end)

CreateThread(function()
    while true do
        for citizenid in pairs(deletedCharacters) do
            -- Let already-running snapshots finish before deleting, and prevent new snapshots
            -- from reintroducing this character while its deletion is pending.
            while next(reporting) do Wait(250) end
            local status = apiAwait('POST', '/api/fivem/characters/deleted', { citizenid = citizenid }, 10000)
            if status == 200 then
                deletedCharacters[citizenid] = nil
                saveDeletedCharacters()
                log('character deletion synced', citizenid)
            else
                print(('[drp-gate] character deletion sync failed (HTTP %s); retrying'):format(status))
            end
        end
        Wait(5000)
    end
end)

local function reportCharactersFor(src)
    if not Config.ReportCharacters or not GetPlayerName(src) then return end
    local ids = identifiers(src)
    if not ids.license then return end
    if reporting[ids.license] then pending[ids.license] = src return end
    reporting[ids.license] = true

    CreateThread(function()
        local chars, seen = {}, {}
        local active = activeCitizenId(src)
        local function add(data)
            if data and data.citizenid and not deletedCharacters[data.citizenid] and not seen[data.citizenid] then
                seen[data.citizenid] = true
                chars[#chars + 1] = toCharacter(data)
            end
        end

        local ok, err = pcall(function()
            if GetResourceState('qbx_core') == 'started' then
                -- SearchPlayers returns current PlayerData for the online character and decoded
                -- offline PlayerData for the rest. license and license2 are distinct identifiers.
                for _, identifier in ipairs({ ids.license, ids.license2 or ids.license }) do
                    local found = exports.qbx_core:SearchPlayers({ license = identifier })
                    assert(type(found) == 'table', 'Qbox character search failed')
                    for _, player in pairs(found) do add(player.PlayerData) end
                end
                local player = exports.qbx_core:GetPlayer(tonumber(src))
                if player then add(player.PlayerData) end
            elseif GetResourceState('qb-core') == 'started' and GetResourceState('oxmysql') == 'started' then
                local rows = exports.oxmysql:query_async('SELECT citizenid, charinfo, money, job, gang FROM players WHERE license = ? OR license = ?', { ids.license, ids.license2 or ids.license })
                assert(type(rows) == 'table', 'character database query failed')
                local core = exports['qb-core']:GetCoreObject()
                local player = core.Functions.GetPlayer(tonumber(src))
                if player then add(player.PlayerData) end
                for _, row in ipairs(rows) do add(row) end
            else
                error('qbx_core or qb-core with oxmysql is not running')
            end
        end)

        if not ok then
            print(('[drp-gate] character lookup failed: %s'):format(tostring(err)))
        elseif #chars > 0 then
            for i = #chars, 1, -1 do
                if deletedCharacters[chars[i].citizenid] then table.remove(chars, i) end
            end
        end
        if ok and GetResourceState('oxmysql') == 'started' then
            -- Reconcile older deletions too. A missing character is removed only after a
            -- successful lookup by citizenid across the entire game database.
            local status, known = apiAwait('POST', '/api/fivem/characters/known', { license = ids.license }, 10000)
            if status == 200 and known and type(known.characters) == 'table' then
                for _, citizenid in ipairs(known.characters) do
                    if not seen[citizenid] and not deletedCharacters[citizenid] then
                        local queryOk, rows = pcall(function()
                            return exports.oxmysql:query_async('SELECT citizenid FROM players WHERE citizenid = ? LIMIT 1', { citizenid })
                        end)
                        if queryOk and type(rows) == 'table' and #rows == 0 then
                            queueDeletedCharacter(citizenid)
                        elseif not queryOk or type(rows) ~= 'table' then
                            print('[drp-gate] Could not verify a character deletion; keeping the website record')
                        end
                    end
                end
            end
            if (Config.CharacterPlaytimeSource or 'ryn-multichar') == 'ryn-multichar' then
                for _, char in ipairs(chars) do
                    local timeOk, rows = pcall(function()
                        return exports.oxmysql:query_async('SELECT playtime FROM ryn_multichar_metadata WHERE character_id = ? LIMIT 1', { char.citizenid })
                    end)
                    if timeOk and type(rows) == 'table' and rows[1] and tonumber(rows[1].playtime) then
                        char.playtimeMinutes = math.max(0, math.floor(tonumber(rows[1].playtime) / 60))
                    end
                end
            end
        end
        if ok and #chars > 0 then
            local status, response = apiAwait('POST', '/api/fivem/characters', {
                license = ids.license, characters = chars, activeCitizenId = active,
            }, 10000)
            if status ~= 200 or not response or response.updated == 0 then
                print(('[drp-gate] character sync failed or account not linked (HTTP %s): %s'):format(status, response and (response.error or response.note or 'unknown error') or 'no response'))
            else
                log(('synced %d characters'):format(response.updated))
            end
        end
        reporting[ids.license] = nil
        local nextSrc = pending[ids.license]
        pending[ids.license] = nil
        if nextSrc and GetPlayerName(nextSrc) then reportCharactersFor(nextSrc) end
    end)
end

-- Reconcile even when the player stays at character selection or has no characters left.
AddEventHandler('playerJoining', function()
    local src = source
    SetTimeout(10000, function() reportCharactersFor(src) end)
end)

-- Qbox emits this once the character is loaded. Also handle QB's server-side PlayerLoaded event.
RegisterNetEvent('QBCore:Server:OnPlayerLoaded', function()
    local src = source
    characterUnloaded[tostring(src)] = nil
    scheduleHeartbeat()
    SetTimeout(2000, function() reportCharactersFor(src) end)
end)
AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    local src = player and player.PlayerData and player.PlayerData.source
    if src then
        characterUnloaded[tostring(src)] = nil
        scheduleHeartbeat()
        SetTimeout(2000, function() reportCharactersFor(src) end)
    end
end)

-- Changes are debounced so frequent money updates do not flood the website.
local refreshScheduled = {}
local function scheduleCharacterRefresh(src)
    if not src or refreshScheduled[src] then return end
    refreshScheduled[src] = true
    SetTimeout(5000, function()
        refreshScheduled[src] = nil
        reportCharactersFor(src)
    end)
end
AddEventHandler('QBCore:Server:OnMoneyChange', scheduleCharacterRefresh)
AddEventHandler('QBCore:Server:OnJobUpdate', scheduleCharacterRefresh)
AddEventHandler('QBCore:Server:OnGangUpdate', scheduleCharacterRefresh)
AddEventHandler('QBCore:Server:SetDuty', scheduleCharacterRefresh)

CreateThread(function()
    while true do
        Wait(Config.CharacterRefreshMs or 60000)
        for _, p in ipairs(GetPlayers()) do
            reportCharactersFor(tonumber(p))
            Wait(250)
        end
    end
end)

--------------------------------------------------------------------------------
-- Console: `drpqueue` lists the queue
--------------------------------------------------------------------------------
RegisterCommand('drpqueue', function(src)
    if src ~= 0 then return end
    sortQueue()
    print(('[drp-gate] %d in queue, %d online, %d connecting'):format(#queue, onlineCount(), connectingCount()))
    for i, e in ipairs(queue) do
        print(('  #%d %s prio=%d%s waited=%s'):format(i, e.name, e.priority, e.grace and ' (grace)' or '', fmtElapsed(now() - e.joinedAt)))
    end
end, true)
