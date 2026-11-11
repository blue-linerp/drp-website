/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";
// Only force HTTPS when the site is actually served over HTTPS (not for local `next start`).
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "").startsWith("https:");

// Static rendering is kept (no per-request nonce), so inline scripts are allowed;
// everything else is locked down to the origins the site actually uses.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com https://static-cdn.jtvnw.net https://i.ytimg.com",
  "font-src 'self' data:",
  "media-src 'self' https:",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://player.twitch.tv https://clips.twitch.tv",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://discord.com",
  "object-src 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Lets the e2e build live beside a running `next dev` without clobbering .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          ...(!isHttps ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
