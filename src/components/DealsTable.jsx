import { useState } from "react";
import { money, initials, tint } from "../lib/format";
import { Icon, I } from "./icons";

const PILL = {
  Discovery: "bg-sky/10 text-sky border-sky/25",
  Proposal: "bg-brand/10 text-brand-300 border-brand/25",
  Negotiation: "bg-gold/10 text-gold-300 border-gold/25",
  "Closed Won": "bg-cream/10 text-cream border-cream/20",
};
const FILTERS = ["All", "Discovery", "Proposal", "Negotiation", "Closed Won"];

export default function DealsTable({ deals, search, onDelete }) {
  const [stage, setStage] = useState("All");
  const q = search.toLowerCase();
  const rows = deals.filter(
    (d) =>
      (stage === "All" || d.stage === stage) &&
      (d.title + d.customer).toLowerCase().includes(q),
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-6 pt-5 pb-4">
        <div className="mr-auto">
          <h2 className="font-display text-lg">Deal Flow</h2>
          <p className="text-xs text-mist mt-0.5">
            {rows.length} of {deals.length} deals
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStage(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${stage === f ? "bg-brand/15 border-brand/40 text-brand-300" : "border-ink-600 text-mist hover:text-cream hover:border-ink-500"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[10px] tracking-[.16em] uppercase text-mist">
              <th className="px-6 py-3 font-medium">Deal</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium text-right">Value</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Close Date</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                className="group border-t hairline hover:bg-ink-800/40 transition-colors"
              >
                <td className="px-6 py-3.5">
                  <p className="font-medium text-cream/95">{d.title}</p>
                  <p className="text-xs text-mist">{d.customer}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block text-[11px] font-medium border rounded-full px-2.5 py-1 ${PILL[d.stage]}`}
                  >
                    {d.stage}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
                  {money(d.value)}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-grid place-items-center w-7 h-7 rounded-full text-[10px] font-bold ${tint(d.owner)}`}
                    title={d.owner}
                  >
                    {initials(d.owner)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-mist text-xs">
                  {new Date(d.close_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <button
                    onClick={() => onDelete(d.id)}
                    title="Delete deal"
                    className="opacity-0 group-hover:opacity-100 text-mist hover:text-coral transition-all"
                  >
                    <Icon d={I.trash} className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-sm text-mist"
                >
                  No deals match — adjust filters or add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
