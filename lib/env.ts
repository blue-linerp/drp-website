import "server-only";

/** Server-only configuration. Values are read lazily so builds work without every secret set. */
const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  get guildId() {
    return process.env.DISCORD_GUILD_ID ?? "";
  },
  get botToken() {
    return process.env.DISCORD_BOT_TOKEN ?? "";
  },
  get whitelistRoleId() {
    return process.env.WHITELIST_ROLE_ID ?? "";
  },
  get adminRoleIds() {
    return list(process.env.ADMIN_ROLE_IDS);
  },
  get seniorStaffRoleIds() {
    return list(process.env.SENIOR_STAFF_ROLE_IDS);
  },
  get staffRoleIds() {
    return list(process.env.STAFF_ROLE_IDS);
  },
  /** "police:roleId,ems:roleId" → department heads for those departments */
  get deptHeadRoles(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const pair of list(process.env.DEPT_HEAD_ROLE_IDS)) {
      const [dept, role] = pair.split(":").map((s) => s.trim());
      if (dept && role) (out[dept.toLowerCase()] ??= []).push(role);
    }
    return out;
  },
  /** Queue priority bonus given to anyone with a staff permission. */
  get staffPriorityBonus() {
    return Number(process.env.STAFF_PRIORITY_BONUS ?? 200);
  },
  get appWebhookUrl() {
    return process.env.APP_WEBHOOK_URL ?? "";
  },
  get logWebhookUrl() {
    return process.env.LOG_WEBHOOK_URL ?? "";
  },
  get fivemEndpoint() {
    return (process.env.FIVEM_SERVER_ENDPOINT ?? "").replace(/\/$/, "");
  },
  get cfxJoinCode() {
    return (process.env.CFX_JOIN_CODE ?? process.env.NEXT_PUBLIC_CFX_JOIN_CODE ?? "").replace(/^.*\/join\//, "");
  },
  get fivemApiSecret() {
    return process.env.FIVEM_API_SECRET ?? "";
  },
  get fivemAllowedIps() {
    return list(process.env.FIVEM_ALLOWED_IPS);
  },
  get twitchClientId() {
    return process.env.TWITCH_CLIENT_ID ?? "";
  },
  get twitchClientSecret() {
    return process.env.TWITCH_CLIENT_SECRET ?? "";
  },
  get twitchServerTags() {
    const tags = list(process.env.TWITCH_SERVER_TAGS);
    return tags.length ? tags : [process.env.NEXT_PUBLIC_SHORT_NAME || "Dream RP", "DreamRP", "#DreamRP"];
  },
  get youtubeApiKey() {
    return process.env.YOUTUBE_API_KEY ?? "";
  },
  get tebexWebhookSecret() {
    return process.env.TEBEX_WEBHOOK_SECRET ?? "";
  },
  get upstashUrl() {
    return process.env.UPSTASH_REDIS_REST_URL ?? "";
  },
  get upstashToken() {
    return process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  },
};
