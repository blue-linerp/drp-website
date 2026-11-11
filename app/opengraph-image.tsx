import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 1920, height: 1080 };
export const contentType = "image/png";
export const alt = `${site.name}: GTA V roleplay`;

/** 1920×1080 Open Graph card in the HUD style: graphite, red accent, chamfered mark. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 120,
          background: "radial-gradient(70% 90% at 85% 0%, rgba(228,8,10,.35), transparent 60%), linear-gradient(180deg, #121215, #0A0A0C)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              background: "#E4080A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 58,
              fontWeight: 800,
              clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
            }}
          >
            {site.logoText}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 800, textTransform: "uppercase" }}>{site.shortName}</div>
            <div style={{ fontSize: 26, letterSpacing: 10, color: "rgba(255,255,255,.5)", textTransform: "uppercase" }}>Roleplay</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 120, height: 4, background: "#E4080A", marginBottom: 40, boxShadow: "0 0 24px #E4080A" }} />
          <div style={{ fontSize: 150, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.95 }}>Make your next move.</div>
          <div style={{ marginTop: 36, fontSize: 40, color: "rgba(255,255,255,.7)" }}>A new face. A familiar city. A story that goes wherever you take it.</div>
        </div>
      </div>
    ),
    size,
  );
}
