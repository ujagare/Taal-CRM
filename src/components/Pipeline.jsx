import { useEffect, useState } from "react";
import { money } from "../lib/format";

const STAGES = [
  { key: "Discovery", from: "#60A5FA", to: "#3B82F6", w: 0.15, dot: "bg-sky" },
  { key: "Proposal", from: "#F87171", to: "#DC2626", w: 0.4, dot: "bg-brand" },
  { key: "Negotiation", from: "#FBBF24", to: "#F59E0B", w: 0.7, dot: "bg-gold" },
  { key: "Closed Won", from: "#FDE68A", to: "#F59E0B", w: 1, dot: "bg-gold-300" },
];

export default function Pipeline({ deals }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const groups = STAGES.map((s) => {
    const ds = deals.filter((d) => d.stage === s.key);
    return {
      ...s,
      count: ds.length,
      sum: ds.reduce((a, d) => a + Number(d.value), 0),
    };
  });
  const max = Math.max(...groups.map((g) => g.sum), 1);
  const forecast = groups.reduce((a, g) => a + g.sum * g.w, 0);

  return (
    <div className="card-premium p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-lg">Pipeline</h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-300 bg-gold/10 border border-gold/20 rounded-full px-2.5 py-1">
          Weighted {money(forecast, true)}
        </span>
      </div>
      <div className="space-y-4">
        {groups.map((g, i) => (
          <div key={g.key}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-cream/90">
                <span className={`w-2 h-2 rounded-full ${g.dot}`} />
                {g.key}
                <span className="text-[10px] text-mist bg-ink-700/60 rounded-full px-1.5 py-px">
                  {g.count}
                </span>
              </span>
              <span className="tabular-nums text-cream/80 text-sm">
                {money(g.sum, true)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink-700/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{
                  width: mounted ? `${(g.sum / max) * 100}%` : 0,
                  background: `linear-gradient(90deg, ${g.from}, ${g.to})`,
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
