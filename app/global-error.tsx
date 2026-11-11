"use client";

/** Last-resort error page (root layout failed), so it can't rely on globals.css or fonts. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0A0A0C", color: "#f2f3f5", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: 24, maxWidth: 520 }}>
          <p style={{ color: "#E4080A", letterSpacing: ".3em", fontSize: 12, fontWeight: 700 }}>ERROR 500</p>
          <h1 style={{ fontSize: 44, textTransform: "uppercase", margin: "12px 0" }}>The city hit a pothole.</h1>
          <p style={{ color: "rgba(255,255,255,.7)" }}>Something went wrong on our side. Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 24, background: "#E4080A", color: "#fff", border: 0, padding: "14px 28px", fontWeight: 700, letterSpacing: ".15em", cursor: "pointer" }}>
            TRY AGAIN
          </button>
        </main>
      </body>
    </html>
  );
}
