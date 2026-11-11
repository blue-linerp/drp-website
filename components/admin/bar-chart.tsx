"use client";
import { useState } from "react";

/**
 * Single-series column chart (applications per day). Accent bars with a 2px gap,
 * 4px rounded data-end, recessive grid, per-bar hover/focus tooltip, and a table view.
 */
export function BarChart({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const W = 640;
  const H = 200;
  const padL = 28;
  const padB = 22;
  const plotW = W - padL;
  const plotH = H - padB - 8;
  const step = plotW / data.length;
  const barW = Math.max(4, step - 2);
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <figure>
      <div className="flex items-center justify-between">
        <figcaption className="font-digits text-sm font-semibold text-white">{label}</figcaption>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs text-white/50 underline underline-offset-4 hover:text-white">
          {table ? "Show chart" : "Show table"}
        </button>
      </div>
      {table ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-white/50">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">Applications</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t border-white/5">
                <td className="py-1.5">{fmt(d.date)}</td>
                <td className="py-1.5 text-right font-mono text-white">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}. Use "Show table" for the values.`}>
            {[0, 0.5, 1].map((t) => {
              const y = 8 + plotH * (1 - t);
              return (
                <g key={t}>
                  <line x1={padL} x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray={t === 0 ? undefined : "2 4"} />
                  <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-white/40 font-mono text-[10px]">
                    {Math.round(nice * t)}
                  </text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const h = (d.value / nice) * plotH;
              const x = padL + i * step + 1;
              const y = 8 + plotH - h;
              const r = Math.min(4, h, barW / 2);
              return (
                <g key={d.date}>
                  {h > 0 && (
                    <path
                      d={`M${x},${8 + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${8 + plotH} Z`}
                      fill="rgb(228 8 10)"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                  {/* Hit target taller and wider than the mark */}
                  <rect
                    x={padL + i * step}
                    y={0}
                    width={step}
                    height={H - padB}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${fmt(d.date)}: ${d.value}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                  {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
                    <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-white/40 font-mono text-[10px]">
                      {fmt(d.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div
              className="chamfer chamfer-sm pointer-events-none absolute -translate-x-1/2 border border-white/10 bg-ink-600 px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((padL + hover * step + step / 2) / W) * 100}%`, top: 0 }}
            >
              <p className="text-white/60">{fmt(data[hover].date)}</p>
              <p className="font-mono text-sm text-white">{data[hover].value} applications</p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
