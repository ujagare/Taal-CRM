import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { sendWhatsApp } from "../utils/whatsapp";
import { Icon, I } from "./icons";

const SIZES = ['26"', '28"', '30"'];

const makePane = (thapi = 0, dhoom = 0) => ({
  thapi,
  dhoom,
  arrived: null,
  broughtBy: null,
  broughtAt: null,
  dbSize: null,
});

const INITIAL_OLD = {
  '26"': makePane(3, 3),
  '28"': makePane(37, 51),
  '30"': makePane(8, 9),
};

const INITIAL_NEW = {
  '26"': makePane(),
  '28"': makePane(),
  '30"': makePane(),
};

const EMPTY = makePane();

function normalizeSize(size) {
  const raw = String(size || "");
  const normalized = raw
    .replace(/[\u0966-\u096F]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0966),
    )
    .replace(/[“”]/g, '"')
    .trim();

  if (normalized.includes("26")) return '26"';
  if (normalized.includes("28")) return '28"';
  if (normalized.includes("30")) return '30"';
  return normalized || '26"';
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function totalOf(data, key) {
  return Object.values(data).reduce(
    (sum, item) => sum + (Number(item[key]) || 0),
    0,
  );
}

function grandTotal(data) {
  return Object.values(data).reduce(
    (sum, item) => sum + (Number(item.thapi) || 0) + (Number(item.dhoom) || 0),
    0,
  );
}

function getStatus(total) {
  if (total >= 80)
    return {
      label: "High Stock",
      className: "border-emerald/30 bg-emerald/10 text-emerald shadow-[0_1px_6px_rgba(5,150,105,.15)]",
      dot: "bg-emerald",
    };
  if (total >= 35)
    return {
      label: "Balanced",
      className: "border-gold/30 bg-gold/10 text-gold shadow-[0_1px_6px_rgba(200,135,25,.15)]",
      dot: "bg-gold",
    };
  return {
    label: "Low Stock",
    className: "border-brand/35 bg-brand/10 text-brand shadow-[0_1px_6px_rgba(227,27,35,.15)]",
    dot: "bg-brand animate-pulseDot",
  };
}

function MetricCard({ label, value, sub, tone = "brand", icon }) {
  const tones = {
    brand:   { grad: "from-brand/[.14]",   icon: "bg-brand/10 text-brand ring-brand/20",       bar: "from-brand-300 to-brand" },
    gold:    { grad: "from-gold/[.14]",    icon: "bg-gold/10 text-gold-300 ring-gold/25",      bar: "from-gold to-gold-300" },
    sky:     { grad: "from-sky/[.14]",     icon: "bg-sky/10 text-sky ring-sky/20",             bar: "from-sky to-sky/70" },
    emerald: { grad: "from-emerald/[.14]", icon: "bg-emerald/10 text-emerald ring-emerald/20", bar: "from-emerald to-emerald/70" },
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,23,42,.06),0_24px_48px_-12px_rgba(15,23,42,.14)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${tones.grad} via-transparent to-transparent`} />
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${tones.icon.split(" ")[1]}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/80">
            {label}
          </p>
          <p className="mt-2.5 font-display text-[2rem] leading-none font-semibold tabular-nums text-cream">
            {value}
          </p>
          <p className="mt-1.5 truncate text-xs text-mist">{sub}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 shadow-sm transition-transform duration-300 group-hover:scale-110 ${tones.icon}`}>
          <Icon d={icon} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, tone }) {
  const width = Math.min(100, max ? (value / max) * 100 : 0);
  const color = {
    thapi: "from-brand/80 to-brand",
    dhoom: "from-sky/80 to-sky",
    new: "from-gold/80 to-gold",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-cream/90">{label}</span>
        <span className="rounded-md bg-slate-100/80 px-2 py-0.5 font-mono text-sm font-bold tabular-nums text-cream">
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} shadow-[0_1px_4px_rgba(15,23,42,.15)] transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function EditModal({ size, paneType, current, onSave, onClose }) {
  const [thapi, setThapi] = useState(current.thapi);
  const [dhoom, setDhoom] = useState(current.dhoom);
  const [count, setCount] = useState(
    (Number(current.thapi) || 0) + (Number(current.dhoom) || 0),
  );
  const [broughtBy, setBroughtBy] = useState(current.broughtBy || "");
  const [broughtAt, setBroughtAt] = useState(
    current.broughtAt ? current.broughtAt.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const label = paneType === "old" ? "Old Pane Stock" : "New Pane Stock";

  // Lock body scroll when modal opens
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = "";
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const broughtAtISO = broughtAt ? new Date(broughtAt).toISOString() : null;
    const finalThapi =
      paneType === "new" ? Number(count) || 0 : Number(thapi) || 0;
    const finalDhoom = paneType === "new" ? 0 : Number(dhoom) || 0;
    await onSave(
      paneType,
      size,
      { thapi: finalThapi, dhoom: finalDhoom },
      broughtBy.trim() || null,
      broughtAtISO,
    );
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 animate-rise max-h-[90vh] overflow-y-auto scroll-thin">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent" />
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/25 shadow-sm">
                <Icon d={I.sliders} className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">
                  Update Inventory
                </p>
                <h2 className="mt-0.5 font-display text-2xl font-semibold text-cream">
                  {size} {label}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-mist shadow-sm transition-all duration-200 hover:border-brand/40 hover:bg-rose-50 hover:text-brand active:scale-95"
              aria-label="Close modal"
            >
              <Icon d={I.x} className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {paneType === "old" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-mist">
                    Thapi
                  </span>
                  <input
                    type="number"
                    value={thapi}
                    onChange={(event) => setThapi(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 font-mono text-lg font-semibold text-cream shadow-inner-sm transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-mist">
                    Dhoom
                  </span>
                  <input
                    type="number"
                    value={dhoom}
                    onChange={(event) => setDhoom(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 font-mono text-lg font-semibold text-cream shadow-inner-sm transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                  />
                </label>
              </div>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-mist">
                  New Pane Count
                </span>
                <input
                  type="number"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 font-mono text-lg font-semibold text-cream shadow-inner-sm transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
              </label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-mist">
                  Brought By
                </span>
                <input
                  type="text"
                  value={broughtBy}
                  onChange={(event) => setBroughtBy(event.target.value)}
                  placeholder="Name"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-cream placeholder:text-slate-400 shadow-inner-sm transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-mist">
                  Brought Date
                </span>
                <input
                  type="date"
                  value={broughtAt}
                  onChange={(event) => setBroughtAt(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-cream shadow-inner-sm transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
              </label>
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-mist shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-cream active:scale-[.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-300 px-6 py-2.5 text-sm font-bold text-white shadow-[0_2px_10px_rgba(227,27,35,.3)] transition-all duration-200 hover:shadow-[0_4px_18px_rgba(227,27,35,.4)] hover:brightness-105 active:scale-[.98] disabled:opacity-50 disabled:shadow-none"
            >
              <Icon d={I.check} className="h-4 w-4" />
              {saving ? "Saving..." : "Save Update"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-rise">
      <div className="h-48 rounded-xl bg-ink-850 shimmer" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 rounded-xl bg-ink-850 shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-72 rounded-xl bg-ink-850 shimmer" />
        ))}
      </div>
    </div>
  );
}

function PaneCard({ size, paneType, item, max, onEdit, onReset }) {
  const total = (Number(item.thapi) || 0) + (Number(item.dhoom) || 0);
  const status = getStatus(total);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_2px_6px_rgba(15,23,42,.06),0_28px_56px_-12px_rgba(15,23,42,.14)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(227,27,35,.07),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-brand/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-mist/80">
              Dhol Pane Size
            </p>
            <h3 className="mt-1 font-display text-4xl font-semibold tracking-tight text-cream">
              {size}
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {paneType === "old" ? (
            <>
              <MiniBar
                label="Thapi"
                value={Number(item.thapi) || 0}
                max={Math.max(max.thapi, 1)}
                tone="thapi"
              />
              <MiniBar
                label="Dhoom"
                value={Number(item.dhoom) || 0}
                max={Math.max(max.dhoom, 1)}
                tone="dhoom"
              />
            </>
          ) : (
            <MiniBar
              label="New Pane"
              value={total}
              max={Math.max(max.total, 1)}
              tone="new"
            />
          )}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/80 to-slate-100/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mist/80">Total Stock</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-cream">
              {total}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 text-[11px] text-mist">
            <div>
              <p className="uppercase tracking-[.14em] text-mist/70">Updated</p>
              <p className="mt-1 font-medium text-cream/90">{fmtDate(item.arrived)}</p>
            </div>
            <div>
              <p className="uppercase tracking-[.14em] text-mist/70">
                Brought By
              </p>
              <p className="mt-1 truncate font-medium text-cream/90">
                {item.broughtBy || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onEdit(paneType, size)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-300 px-3 py-2.5 text-sm font-bold text-white shadow-[0_2px_10px_rgba(227,27,35,.28)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(227,27,35,.38)] hover:brightness-105 active:scale-[.98]"
          >
            <Icon d={I.sliders} className="h-4 w-4" />
            Update
          </button>
          {paneType === "new" && (
            <button
              onClick={() => onReset(paneType, size)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand shadow-sm transition-all duration-200 hover:bg-brand/20 hover:shadow-[0_2px_8px_rgba(227,27,35,.2)] active:scale-95"
              aria-label={`Remove ${size} new pane stock`}
            >
              <Icon d={I.trash} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PaneSection({ title, subtitle, paneType, data, onEdit, onReset }) {
  const max = useMemo(
    () => ({
      thapi: Math.max(
        ...SIZES.map((size) => Number(data[size]?.thapi) || 0),
        1,
      ),
      dhoom: Math.max(
        ...SIZES.map((size) => Number(data[size]?.dhoom) || 0),
        1,
      ),
      total: Math.max(
        ...SIZES.map(
          (size) =>
            (Number(data[size]?.thapi) || 0) + (Number(data[size]?.dhoom) || 0),
        ),
        1,
      ),
    }),
    [data],
  );

  const thapiTotal = totalOf(data, "thapi");
  const dhoomTotal = totalOf(data, "dhoom");
  const sectionTotal = thapiTotal + dhoomTotal;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[.2em] ${paneType === "old" ? "text-brand" : "text-gold"}`}>
            {paneType === "old" ? "Existing Stock" : "Fresh Stock"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-cream">
            {title}
          </h2>
          <p className="mt-1 text-sm text-mist">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {paneType === "old" && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[.08] px-3.5 py-1.5 font-bold text-brand shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Thapi {thapiTotal}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/25 bg-sky/[.08] px-3.5 py-1.5 font-bold text-sky shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-sky" />
                Dhoom {dhoomTotal}
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-bold text-cream shadow-sm">
            Total {sectionTotal}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SIZES.map((size) => (
          <PaneCard
            key={size}
            size={size}
            paneType={paneType}
            item={data[size] || EMPTY}
            max={max}
            onEdit={onEdit}
            onReset={onReset}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)] md:block">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/60">
                <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Size
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Thapi
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Dhoom
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Total
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Updated
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Brought By
                </th>
                <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-[.18em] text-mist">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((size) => {
                const item = data[size] || EMPTY;
                const total =
                  (Number(item.thapi) || 0) + (Number(item.dhoom) || 0);
                const status = getStatus(total);
                return (
                  <tr
                    key={size}
                    onClick={() => onEdit(paneType, size)}
                    className="cursor-pointer border-b border-slate-100 transition-all duration-200 last:border-0 hover:bg-brand/[.04]"
                  >
                    <td className="px-5 py-4 font-display text-lg font-semibold text-cream">
                      {size}
                    </td>
                    <td className="px-5 py-4 text-center font-mono tabular-nums text-cream/90">
                      {item.thapi}
                    </td>
                    <td className="px-5 py-4 text-center font-mono tabular-nums text-cream/90">
                      {item.dhoom}
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-bold tabular-nums text-cream">
                      {total}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-mist">
                      {fmtDate(item.arrived)}
                    </td>
                    <td className="px-5 py-4 text-center text-xs font-medium text-cream/85">
                      {item.broughtBy || "-"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function DholPan() {
  const [oldData, setOldData] = useState(INITIAL_OLD);
  const [newData, setNewData] = useState(INITIAL_NEW);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);

  /* Dori Inventory State */
  const [doriCount, setDoriCount] = useState(47);
  const [doriLoading, setDoriLoading] = useState(false);
  const [doriEditMode, setDoriEditMode] = useState(false);
  const [doriAddCount, setDoriAddCount] = useState("");
  const [doriAddedBy, setDoriAddedBy] = useState("");

  const toRow = (paneType, size, item) => ({
    pane_type: paneType,
    size,
    thapi: item.thapi,
    dhoom: item.dhoom,
    arrived_at: item.arrived,
    brought_at: item.broughtAt,
    brought_by: item.broughtBy,
  });

  const fromRows = (rows) => {
    const oldRows = { ...INITIAL_OLD };
    const newRows = { ...INITIAL_NEW };

    rows.forEach((row) => {
      const key = normalizeSize(row.size);
      if (!SIZES.includes(key)) return;
      const target = row.pane_type === "new" ? newRows : oldRows;
      target[key] = {
        thapi: Number(row.thapi) || 0,
        dhoom: Number(row.dhoom) || 0,
        arrived: row.arrived_at || null,
        broughtBy: row.brought_by || null,
        broughtAt: row.brought_at || null,
        dbSize: row.size || key,
      };
    });

    return { old: oldRows, new: newRows };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    let fromRemote = false;
    try {
      const { data: rows, error } = await supabase.from("dhol_pan").select("*");
      if (!error && rows && rows.length > 0) {
        const { old, new: nextNew } = fromRows(rows);
        setOldData(old);
        setNewData(nextNew);
        localStorage.setItem("dhol_pan_cache", JSON.stringify({ old, new: nextNew }));
        fromRemote = true;
      }
    } catch { /* fall through to cache */ }

    if (!fromRemote) {
      const cached = localStorage.getItem("dhol_pan_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setOldData(parsed.old || INITIAL_OLD);
          setNewData(parsed.new || INITIAL_NEW);
        } catch {
          setOldData(INITIAL_OLD);
          setNewData(INITIAL_NEW);
        }
      } else {
        setOldData(INITIAL_OLD);
        setNewData(INITIAL_NEW);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("dhol-pan-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dhol_pan" },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  /* ─── Dori Inventory Load ─── */
  const loadDori = useCallback(async () => {
    try {
      const { data: rows } = await supabase
        .from("dori_inventory")
        .select("*")
        .limit(1);
      if (rows && rows.length > 0) {
        setDoriCount(Number(rows[0].current_count) || 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadDori();
  }, [loadDori]);

  /* Dori real-time subscription */
  useEffect(() => {
    const channel = supabase
      .channel("dori-inventory-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dori_inventory" },
        () => {
          loadDori();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDori]);

  /* ─── Dori Add/Subtract ─── */
  const handleDoriUpdate = async (delta) => {
    setDoriLoading(true);
    try {
      const { data: rows } = await supabase
        .from("dori_inventory")
        .select("*")
        .limit(1);

      if (rows && rows.length > 0) {
        const current = Number(rows[0].current_count) || 0;
        const newCount = Math.max(0, current + delta);

        await supabase
          .from("dori_inventory")
          .update({
            current_count: newCount,
            last_updated_at: new Date().toISOString(),
            last_updated_by: doriAddedBy.trim() || null,
          })
          .eq("id", rows[0].id);

        setDoriCount(newCount);
      } else {
        // No row exists, insert one
        await supabase.from("dori_inventory").insert({
          current_count: Math.max(0, delta),
          last_updated_by: doriAddedBy.trim() || null,
        });
        setDoriCount(Math.max(0, delta));
      }
    } catch (err) {
      console.warn("Dori update failed:", err);
    }

    /* ─── AUTO WHATSAPP TRIGGER: Dori low stock alert ─── */
    try {
      const { data: checkRows } = await supabase
        .from("dori_inventory")
        .select("current_count")
        .limit(1);
      const finalCount = checkRows?.[0]?.current_count ?? 0;
      if (Number(finalCount) < 10 && Number(finalCount) >= 0) {
        const adminPhone = localStorage.getItem("wa_admin_phone");
        if (adminPhone) {
          const alertMsg = `⚠️ *TAAL CRM Alert*\n\n📦 Dori Stock Low!\nसध्या डोरी stock: *${finalCount}*\n\nकृपया नवीन डोरी आणा! 🙏`;
          sendWhatsApp(adminPhone, alertMsg).catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }

    setDoriLoading(false);
    setDoriEditMode(false);
    setDoriAddCount("");
    setDoriAddedBy("");
  };

  const updateCounts = async (paneType, size, counts, broughtBy, broughtAt) => {
    const now = new Date().toISOString();
    const current = paneType === "old" ? oldData[size] : newData[size];
    const dbSize = current?.dbSize || size;
    const updated = {
      ...counts,
      arrived: now,
      broughtBy: broughtBy || null,
      broughtAt: broughtAt || null,
      dbSize,
    };

    if (paneType === "old")
      setOldData((prev) => ({ ...prev, [size]: updated }));
    else setNewData((prev) => ({ ...prev, [size]: updated }));
    setEditModal(null);

    // Use UPSERT to insert if not exists, update if exists
    const { error } = await supabase.from("dhol_pan").upsert(
      {
        pane_type: paneType,
        size: dbSize,
        thapi: counts.thapi,
        dhoom: counts.dhoom,
        arrived_at: now,
        brought_by: broughtBy || null,
        brought_at: broughtAt || null,
      },
      {
        onConflict: "pane_type,size",
      },
    );

    if (error) {
      console.error("Supabase upsert failed:", error.message, error);
      alert(`Data save nahi hua: ${error.message}`);
    } else {
      console.log("✅ Pan data successfully saved to Supabase");
    }
  };

  const resetPane = async (paneType, size) => {
    const now = new Date().toISOString();
    const current = paneType === "old" ? oldData[size] : newData[size];
    const dbSize = current?.dbSize || size;
    const cleared = {
      thapi: 0,
      dhoom: 0,
      arrived: now,
      broughtBy: null,
      broughtAt: null,
      dbSize,
    };

    if (paneType === "old")
      setOldData((prev) => ({ ...prev, [size]: cleared }));
    else setNewData((prev) => ({ ...prev, [size]: cleared }));

    // Use UPSERT for reset as well
    const { error } = await supabase.from("dhol_pan").upsert(
      {
        pane_type: paneType,
        size: dbSize,
        thapi: 0,
        dhoom: 0,
        arrived_at: now,
        brought_by: null,
        brought_at: null,
      },
      {
        onConflict: "pane_type,size",
      },
    );

    if (error) {
      console.error("Supabase reset failed:", error.message, error);
      alert(`Reset nahi hua: ${error.message}`);
    } else {
      console.log("✅ Pan data successfully reset in Supabase");
    }
  };

  const downloadReport = async () => {
    const oldTotal = grandTotal(oldData);
    const newTotal = grandTotal(newData);
    const total = oldTotal + newTotal;
    const generated = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const autoTable = autoTableModule.default;
    const page = doc.internal.pageSize;
    const margin = 14;
    let y = margin;

    try {
      const logo = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 4000);
        img.src = `${window.location.origin}/taal-pathak-logo-red.png`;
      });
      if (logo) {
        const logoWidth = 26;
        const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
        doc.addImage(
          logo,
          "PNG",
          (page.width - logoWidth) / 2,
          y,
          logoWidth,
          logoHeight,
        );
        y += logoHeight + 5;
      }
    } catch (_) {
      // Logo is optional for PDF export.
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(24, 24, 27);
    doc.text("Dhol Pane Inventory Report", page.width / 2, y, {
      align: "center",
    });
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`Generated: ${generated}`, page.width / 2, y, { align: "center" });
    y += 14;

    const cardWidth = (page.width - margin * 2 - 8) / 3;
    [
      ["Old Pane", oldTotal],
      ["New Pane", newTotal],
      ["Grand Total", total],
    ].forEach(([label, value], index) => {
      const x = margin + index * (cardWidth + 4);
      doc.setFillColor(
        index === 2 ? 255 : 248,
        index === 2 ? 242 : 248,
        index === 2 ? 242 : 248,
      );
      doc.setDrawColor(
        index === 2 ? 220 : 225,
        index === 2 ? 38 : 225,
        index === 2 ? 38 : 225,
      );
      doc.roundedRect(x, y, cardWidth, 21, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setTextColor(113, 113, 122);
      doc.text(label, x + cardWidth / 2, y + 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(
        index === 2 ? 220 : 24,
        index === 2 ? 38 : 24,
        index === 2 ? 38 : 27,
      );
      doc.text(String(value), x + cardWidth / 2, y + 15, { align: "center" });
      doc.setFont("helvetica", "normal");
    });
    y += 31;

    const body = [];
    SIZES.forEach((size) => {
      const oldItem = oldData[size] || EMPTY;
      const newItem = newData[size] || EMPTY;
      body.push([
        size,
        "Old",
        String(oldItem.thapi),
        String(oldItem.dhoom),
        String((Number(oldItem.thapi) || 0) + (Number(oldItem.dhoom) || 0)),
        fmtDate(oldItem.arrived),
        oldItem.broughtBy || "-",
        fmtDate(oldItem.broughtAt),
      ]);
      body.push([
        size,
        "New",
        String(newItem.thapi),
        String(newItem.dhoom),
        String((Number(newItem.thapi) || 0) + (Number(newItem.dhoom) || 0)),
        fmtDate(newItem.arrived),
        newItem.broughtBy || "-",
        fmtDate(newItem.broughtAt),
      ]);
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [
        [
          "Size",
          "Type",
          "Thapi",
          "Dhoom",
          "Total",
          "Updated",
          "Brought By",
          "Brought Date",
        ],
      ],
      body,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        halign: "center",
        lineColor: [225, 225, 225],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: { 0: { fontStyle: "bold" }, 4: { fontStyle: "bold" } },
    });

    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `TAAL Pathak CRM - ${new Date().getFullYear()}`,
      page.width / 2,
      page.height - 10,
      { align: "center" },
    );
    doc.save(`Dhol-Pane-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const openEdit = (paneType, size) => {
    setEditModal({ paneType, size });
  };

  const oldTotal = grandTotal(oldData);
  const newTotal = grandTotal(newData);
  const thapiTotal = totalOf(oldData, "thapi") + totalOf(newData, "thapi");
  const dhoomTotal = totalOf(oldData, "dhoom") + totalOf(newData, "dhoom");
  const currentEditData = editModal
    ? (editModal.paneType === "old" ? oldData : newData)[editModal.size] ||
      EMPTY
    : EMPTY;

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-7 animate-rise">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,.05),0_16px_40px_-8px_rgba(15,23,42,.1)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,rgba(227,27,35,.08),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_100%_100%,rgba(200,135,25,.08),transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-gradient-to-r from-brand/10 to-brand/5 px-3.5 py-1.5 text-xs font-bold text-brand shadow-[0_1px_6px_rgba(227,27,35,.12)]">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulseDot" />
                Live Dhol Pane Inventory
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl lg:text-[2.6rem]">
                Dhol Pane{" "}
                <span className="bg-gradient-to-r from-brand via-brand-300 to-gold bg-clip-text text-transparent">
                  Control Room
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
                Old pane, new pane, thapi, dhoom, brought by aur updated date ka
                premium inventory view — sab kuch ek jagah.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-mist/80">
                Grand Inventory
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <span className="font-display text-5xl font-semibold tabular-nums text-cream">
                  {oldTotal + newTotal}
                </span>
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-cream shadow-sm transition-all duration-200 hover:border-brand/40 hover:text-brand hover:shadow-[0_2px_12px_rgba(227,27,35,.15)] active:scale-[.98]"
                >
                  <Icon d={I.inbox} className="h-4 w-4" />
                  PDF
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg border border-brand/15 bg-brand/[.07] px-3 py-2 font-semibold text-brand-300">
                  Old <b className="text-brand">{oldTotal}</b>
                </span>
                <span className="rounded-lg border border-gold/20 bg-gold/[.08] px-3 py-2 font-semibold text-gold-300">
                  New <b className="text-gold">{newTotal}</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Old Pane"
          value={oldTotal}
          sub="Existing thapi + dhoom"
          tone="brand"
          icon={I.chart}
        />
        <MetricCard
          label="New Pane"
          value={newTotal}
          sub="Fresh available stock"
          tone="gold"
          icon={I.plus}
        />
        <MetricCard
          label="Total Thapi"
          value={thapiTotal}
          sub="All sizes combined"
          tone="emerald"
          icon={I.check}
        />
        <MetricCard
          label="Total Dhoom"
          value={dhoomTotal}
          sub="All sizes combined"
          tone="sky"
          icon={I.target}
        />
        <MetricCard
          label="Dori (रस्सी)"
          value={doriCount}
          sub="Available ropes"
          tone="gold"
          icon={I.inbox}
        />
      </section>

      <PaneSection
        title="Old Pane Stock"
        subtitle="Current usable old pane by size, thapi and dhoom."
        paneType="old"
        data={oldData}
        onEdit={openEdit}
        onReset={resetPane}
      />

      <PaneSection
        title="New Pane Stock"
        subtitle="Fresh arrivals and available pane count."
        paneType="new"
        data={newData}
        onEdit={openEdit}
        onReset={resetPane}
      />

      {/* ═══════ DORI INVENTORY SECTION ═══════ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">
              Rope Inventory
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-cream">
              ढोलाची दोरी (Dori)
            </h2>
            <p className="mt-1 text-sm text-mist">
              Auto-updated when Daily Report me dori use hoti hai
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-5xl font-semibold tabular-nums text-gold">
              {doriCount}
            </span>
            <span className="text-sm text-mist">रस्सी</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!doriEditMode ? (
            <>
              <button
                onClick={() => setDoriEditMode(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2.5 text-sm font-bold text-emerald shadow-sm transition-all duration-200 hover:bg-emerald/20 hover:shadow-[0_2px_10px_rgba(5,150,105,.2)] active:scale-[.98]"
              >
                <Icon d={I.plus} className="h-4 w-4" />
                Add Dori
              </button>
              <button
                onClick={() => handleDoriUpdate(-1)}
                disabled={doriLoading || doriCount <= 0}
                className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm font-bold text-brand shadow-sm transition-all duration-200 hover:bg-brand/20 hover:shadow-[0_2px_10px_rgba(227,27,35,.2)] active:scale-[.98] disabled:opacity-40"
              >
                <Icon d={I.trash} className="h-4 w-4" />
                Remove 1
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-end gap-3 w-full">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">
                  Add Count
                </span>
                <input
                  type="number"
                  value={doriAddCount}
                  onChange={(e) => setDoriAddCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1.5 w-28 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 font-mono text-lg font-semibold text-cream shadow-inner-sm transition-all duration-200 focus:border-gold focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">
                  Added By
                </span>
                <input
                  type="text"
                  value={doriAddedBy}
                  onChange={(e) => setDoriAddedBy(e.target.value)}
                  placeholder="Name"
                  className="mt-1.5 w-40 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-cream placeholder:text-slate-400 shadow-inner-sm transition-all duration-200 focus:border-gold focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/15"
                />
              </label>
              <button
                onClick={() => {
                  const count = Number(doriAddCount) || 0;
                  if (count > 0) handleDoriUpdate(count);
                }}
                disabled={
                  doriLoading || !doriAddCount || Number(doriAddCount) <= 0
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald to-emerald/80 px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_10px_rgba(5,150,105,.3)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(5,150,105,.4)] hover:brightness-105 active:scale-[.98] disabled:opacity-50"
              >
                <Icon d={I.check} className="h-4 w-4" />
                {doriLoading ? "Saving..." : "Add"}
              </button>
              <button
                onClick={() => {
                  setDoriEditMode(false);
                  setDoriAddCount("");
                  setDoriAddedBy("");
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-mist transition-colors hover:bg-slate-100 hover:text-cream"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/[.07] bg-ink-850/80 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-mist">
              Size Wise Total
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-cream">
              Combined Pane Summary
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-cream shadow-sm">
            Grand Total {oldTotal + newTotal}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SIZES.map((size) => {
            const oldSizeTotal =
              (Number(oldData[size]?.thapi) || 0) +
              (Number(oldData[size]?.dhoom) || 0);
            const newSizeTotal =
              (Number(newData[size]?.thapi) || 0) +
              (Number(newData[size]?.dhoom) || 0);
            const combined = oldSizeTotal + newSizeTotal;
            return (
              <div
                key={size}
                className="group rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-inner transition-all duration-200 hover:border-brand/25 hover:shadow-[0_4px_16px_rgba(15,23,42,.08)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-semibold text-cream">
                    {size}
                  </span>
                  <span className="font-display text-3xl font-semibold tabular-nums text-gradient">
                    {combined}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                  <span className="rounded-lg border border-brand/15 bg-brand/[.07] px-3 py-2 text-brand-300">
                    Old {oldSizeTotal}
                  </span>
                  <span className="rounded-lg border border-gold/20 bg-gold/[.08] px-3 py-2 text-gold-300">
                    New {newSizeTotal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editModal && (
        <EditModal
          size={editModal.size}
          paneType={editModal.paneType}
          current={currentEditData}
          onSave={updateCounts}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

