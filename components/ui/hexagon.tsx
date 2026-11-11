import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hexagon accents in the style of the server's ox_lib UI.
 * Rounded corners come from a round-joined stroke in the fill colour, so the shape stays a
 * simple six-point polygon.
 */

type Orientation = "flat" | "pointy";

/** Six points of a hexagon inset by `pad` inside a w×h box. */
function points(w: number, h: number, pad: number, o: Orientation) {
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad;
  const cx = w / 2;
  const cy = h / 2;
  const qx = (x1 - x0) / 4;
  const qy = (y1 - y0) / 4;
  const pts =
    o === "flat"
      ? [[x0 + qx, y0], [x1 - qx, y0], [x1, cy], [x1 - qx, y1], [x0 + qx, y1], [x0, cy]]
      : [[cx, y0], [x1, y0 + qy], [x1, y1 - qy], [cx, y1], [x0, y1 - qy], [x0, y0 + qy]];
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

/**
 * Solid primary hexagon with a soft halo; dark icon on top.
 * Used for section/header icons (like the alert & context-menu header in game).
 */
export function HexIcon({
  children,
  size = 64,
  color = "rgb(var(--accent-rgb))",
  className,
  style,
  label,
}: {
  children?: ReactNode;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  /** Accessible name when the hexagon carries meaning (e.g. a logo); omit for decoration. */
  label?: string;
}) {
  const w = size;
  const h = Math.round(size * 1.1);
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: w, height: h, ...style }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 overflow-visible">
        <polygon points={points(w, h, w * 0.12, "pointy")} fill={color} fillOpacity={0.16} stroke={color} strokeOpacity={0.16} strokeWidth={w * 0.08} strokeLinejoin="round" />
        <polygon points={points(w, h, w * 0.2, "pointy")} fill={color} stroke={color} strokeWidth={w * 0.06} strokeLinejoin="round" />
      </svg>
      <span className="relative flex items-center justify-center text-[#121212]" style={{ fontSize: Math.round(size * 0.3) }}>
        {children}
      </span>
    </span>
  );
}

/**
 * Dark glass hexagon with a primary gradient ring (key prompts, status badges).
 */
export function HexBadge({
  children,
  size = 52,
  color = "rgb(var(--accent-rgb))",
  className,
}: {
  children?: ReactNode;
  size?: number;
  color?: string;
  className?: string;
}) {
  const w = size;
  const h = Math.round(size * 0.92);
  const id = `hb${size}${color.replace(/\W/g, "")}`;
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#121212" stopOpacity="0.9" />
            <stop offset="1" stopColor="#121212" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`${id}r`} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor={color} />
            <stop offset="0.5" stopColor={color} stopOpacity="0" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <polygon points={points(w, h, w * 0.16, "flat")} fill={`url(#${id}f)`} stroke="rgba(255,255,255,0.08)" strokeWidth={w * 0.05} strokeLinejoin="round" />
        <polygon points={points(w, h, w * 0.1, "flat")} fill="none" stroke={`url(#${id}r)`} strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <span className="relative flex items-center justify-center font-bold text-white" style={{ fontSize: Math.round(size * 0.3) }}>
        {children}
      </span>
    </span>
  );
}
