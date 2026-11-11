import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Design tokens follow the server's ox_lib "Abstract" UI so the website and the in-game
 * menus read as one product: Chakra Petch everywhere, dark translucent panels with an 8px
 * radius and hairline outline, hexagon accents, and a single primary red (#E4080A).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "2rem" }, screens: { "2xl": "1320px" } },
    extend: {
      colors: {
        ink: { DEFAULT: "#0A0A0C", 900: "#0A0A0C", 800: "#0E0E10", 700: "#121212", 600: "#18181B", 500: "#202024", 400: "#2A2A2F" },
        accent: { DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)", text: "#FF4D4F", track: "rgba(120,10,12,.55)" },
        grey: { DEFAULT: "#8D929B", dark: "#3A3D43" },
        status: { online: "#2ECC71", offline: "#EF4444", checking: "#FFB020" },
        tier: { silver: "#C0C4CC", gold: "#E6B450", diamond: "#7FD3FF", emerald: "#2ECC8F" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "sans-serif"],
        sans: ["var(--font-display)", "Segoe UI", "Arial", "sans-serif"],
        /** Labels, buttons, eyebrows: same family as ox_lib, weight does the work. */
        digits: ["var(--font-display)", "Segoe UI", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "Consolas", "Courier New", "monospace"],
      },
      fontSize: {
        hero: ["clamp(3rem, 8vw, 7rem)", { lineHeight: "0.95", letterSpacing: "0" }],
      },
      letterSpacing: { eyebrow: "0.2em" },
      borderColor: { line: "rgba(255,255,255,.16)" },
      keyframes: {
        kenburns: { "0%": { transform: "scale(1.02)" }, "100%": { transform: "scale(1.12)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        ping: { "75%, 100%": { transform: "scale(2.2)", opacity: "0" } },
        "slide-in-down": { "0%": { opacity: "0", transform: "translateY(-40px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pop-in": { "0%": { opacity: "0", transform: "scale(.9)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        drain: { "0%": { width: "100%" }, "100%": { width: "0" } },
      },
      animation: {
        kenburns: "kenburns 24s ease-out infinite alternate",
        shimmer: "shimmer 1.6s infinite",
        ping: "ping 1.6s cubic-bezier(0,0,.2,1) infinite",
        "slide-in-down": "slide-in-down .4s cubic-bezier(.22,1,.36,1) both",
        "pop-in": "pop-in .2s ease-out both",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        // The site's panel corner. Historically a HUD chamfer; now the ox_lib rounded corner,
        // kept under the same names so every panel picks up the new shape.
        ".chamfer": { "border-radius": "8px" },
        ".chamfer-sm": { "border-radius": "6px" },
        ".chamfer-lg": { "border-radius": "12px" },
        ".hex": { "clip-path": "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" },
        ".hex-pointy": { "clip-path": "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" },
        ".preserve-3d": { "transform-style": "preserve-3d" },
        ".backface-hidden": { "backface-visibility": "hidden", "-webkit-backface-visibility": "hidden" },
        ".rotate-y-180": { transform: "rotateY(180deg)" },
        ".perspective": { perspective: "1400px" },
      });
    }),
  ],
};

export default config;
