import { useRef, useState } from "react";
import { money } from "../lib/format";
import { smoothPath } from "../lib/chart";

export default function RevenueChart({ metrics }) {
  const [range, setRange] = useState("12M");
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  if (!metrics || metrics.length === 0) {
    return (
      <div className="card-premium p-6 flex flex-col items-center justify-center h-[300px] gap-3">
        <svg className="w-10 h-10 text-mist/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        <p className="text-mist text-sm">No revenue data available yet.</p>
      </div>
    );
  }

  const rows = range === "6M" ? metrics.slice(-6) : metrics;
  const W = 660,
    H = 240,
    L = 48,
    R = 14,
    T = 16,
    B = 30;
  const max =
    Math.max(...rows.map((m) => Math.max(m.revenue, m.target))) * 1.12;
  const x = (i) => L + (i / (rows.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const rev = rows.map((m, i) => ({ x: x(i), y: y(m.revenue) }));
  const tgt = rows.map((m, i) => ({ x: x(i), y: y(m.target) }));

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (rows.length - 1));
    setHover(Math.max(0, Math.min(rows.length - 1, i)));
  };

  return (
    <div className="card-premium p-6 group">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-lg">Revenue Performance</h2>
          <p className="text-xs text-mist mt-0.5">
            Actual vs. target, trailing {rows.length} months
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-mist">
            <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_6px_rgba(220,38,38,.4)]" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-mist">
            <span className="w-3 border-t-2 border-dashed border-gold rounded-full" />
            Target
          </span>
          <div className="flex bg-ink-800 rounded-lg p-0.5">
            {["6M", "12M"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r);
                  setHover(null);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${range === r ? "bg-brand text-white shadow-[0_2px_8px_rgba(220,38,38,.3)]" : "text-mist hover:text-cream"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity=".18" />
              <stop offset="60%" stopColor="#DC2626" stopOpacity=".08" />
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={L}
                x2={W - R}
                y1={y(max * t)}
                y2={y(max * t)}
                stroke="#475569"
                strokeDasharray="3 6"
                opacity=".35"
              />
              <text
                x={L - 8}
                y={y(max * t) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#64748B"
              >
                {money(max * t, true)}
              </text>
            </g>
          ))}
          {rows.map(
            (m, i) =>
              i % (rows.length > 8 ? 2 : 1) === 0 && (
                <text
                  key={m.id}
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748B"
                >
                  {m.month}
                </text>
              ),
          )}
          {/* Target line */}
          <path
            d={smoothPath(tgt)}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            opacity=".7"
          />
          {/* Revenue area */}
          <path
            d={`${smoothPath(rev)} L${rev.at(-1).x},${H - B} L${L},${H - B} Z`}
            fill="url(#areaFill)"
          />
          {/* Revenue line */}
          <path
            d={smoothPath(rev)}
            fill="none"
            stroke="#DC2626"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="1"
            className="draw"
          />
          {hover != null && (
            <g>
              <line
                x1={rev[hover].x}
                x2={rev[hover].x}
                y1={T}
                y2={H - B}
                stroke="rgba(248,250,252,.15)"
                strokeWidth="1"
              />
              <circle
                cx={rev[hover].x}
                cy={rev[hover].y}
                r="5"
                fill="#F8FAFC"
                stroke="#DC2626"
                strokeWidth="2.5"
              />
              <circle
                cx={tgt[hover].x}
                cy={tgt[hover].y}
                r="3.5"
                fill="#F8FAFC"
                stroke="#F59E0B"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
        {hover != null && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-full z-10 px-3 py-2 rounded-xl bg-ink-900/95 backdrop-blur-md border border-white/[.06] shadow-lift text-xs"
            style={{
              left: `${(rev[hover].x / W) * 100}%`,
              top: `${(rev[hover].y / H) * 100}%`,
              marginTop: -12,
            }}
          >
            <p className="text-mist">{rows[hover].month}</p>
            <p className="font-semibold text-cream tabular-nums">
              {money(rows[hover].revenue, true)} <span className="text-brand-300">revenue</span>
            </p>
            <p className="text-gold-300 tabular-nums">
              {money(rows[hover].target, true)} target
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
