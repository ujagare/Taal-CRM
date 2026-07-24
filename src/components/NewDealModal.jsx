import { useState } from "react";
import { Icon, I } from "./icons";

const inp = `w-full bg-ink-800 border border-ink-600 rounded-lg px-3 py-2.5 text-sm placeholder:text-mist/60
  outline-none focus:border-brand/70 focus:ring-1 focus:ring-brand/40 transition-all`;
const lbl = "block text-[10px] tracking-[.16em] uppercase text-mist mb-1.5";

export default function NewDealModal({ onClose, onAdd }) {
  const [f, setF] = useState({
    title: "",
    customer: "",
    value: "",
    stage: "Discovery",
    owner: "Ava Chen",
    close_date: new Date().toISOString().slice(0, 10),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd({ ...f, value: Number(f.value) || 0 });
        }}
        className="relative card w-full max-w-md p-6 animate-rise shadow-lift"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl">New Deal</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-mist hover:text-cream transition-colors"
          >
            <Icon d={I.x} className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Deal title</label>
            <input
              required
              className={inp}
              value={f.title}
              onChange={set("title")}
              placeholder="e.g. ERP Rollout — Phase I"
            />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Customer</label>
            <input
              required
              className={inp}
              value={f.customer}
              onChange={set("customer")}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className={lbl}>Value (USD)</label>
            <input
              required
              type="number"
              min="0"
              className={inp}
              value={f.value}
              onChange={set("value")}
              placeholder="50000"
            />
          </div>
          <div>
            <label className={lbl}>Stage</label>
            <select className={inp} value={f.stage} onChange={set("stage")}>
              {["Discovery", "Proposal", "Negotiation", "Closed Won"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className={lbl}>Owner</label>
            <select className={inp} value={f.owner} onChange={set("owner")}>
              {["Ava Chen", "Marcus Reid", "Sofia Marino", "Liam Patel"].map(
                (o) => (
                  <option key={o}>{o}</option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className={lbl}>Close date</label>
            <input
              type="date"
              className={inp}
              value={f.close_date}
              onChange={set("close_date")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-mist hover:text-cream hover:bg-ink-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-brand text-ink-950 text-sm font-semibold hover:bg-brand-300 transition-colors"
          >
            Create Deal
          </button>
        </div>
      </form>
    </div>
  );
}
