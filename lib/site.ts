/**
 * Brand + public links. Everything a server owner changes lives here or in env.
 * NEXT_PUBLIC_* values are inlined at build time, so they are safe in client components.
 */
function getSiteUrl() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").trim();
  const value = /^[a-z][a-z\d+.-]*:\/\//i.test(configured) ? configured : `https://${configured}`;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Invalid site URL');
    }
    return url.origin;
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL (or AUTH_URL) must be a valid website origin, for example https://example.com.');
  }
}

export const site = {
  name: process.env.NEXT_PUBLIC_SERVER_NAME || "Dream Roleplay",
  shortName: process.env.NEXT_PUBLIC_SHORT_NAME || "Dream RP",
  logoText: process.env.NEXT_PUBLIC_LOGO_TEXT || "DR",
  tagline: "The city keeps moving. Stay in the conversation.",
  url: getSiteUrl(),
  discordInvite: process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.com",
  discordTicketUrl: process.env.NEXT_PUBLIC_DISCORD_TICKET_URL || process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.com",
  storeUrl: process.env.NEXT_PUBLIC_TEBEX_STORE_URL || process.env.TEBEX_STORE_URL || "",
  /** cfx.re/join/abc123 or ip:port. Used for fivem://connect and the copy command. */
  connectTarget: process.env.NEXT_PUBLIC_CFX_JOIN_CODE || process.env.NEXT_PUBLIC_FIVEM_CONNECT || "",
  fivemDownload: "https://fivem.net/",
  ageWhitelist: Number(process.env.NEXT_PUBLIC_AGE_WHITELIST || 18),
  agePublic: Number(process.env.NEXT_PUBLIC_AGE_PUBLIC || 13),
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/applications", label: "Applications" },
  { href: "/rules", label: "Rules" },
  { href: "/guides", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/creators", label: "Creators" },
  { href: "/queue", label: "Play" },
] as const;

export function connectUrl() {
  return site.connectTarget ? `fivem://connect/${site.connectTarget}` : "";
}
