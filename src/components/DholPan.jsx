import { useCallback, useEffect, useMemo, useState } from "react";
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
      className: "border-emerald/25 bg-emerald/10 text-emerald",
    };
  if (total >= 35)
    return {
      label: "Balanced",
      className: "border-gold/25 bg-gold/10 text-gold-300",
    };
  return {
    label: "Low Stock",
    className: "border-brand/30 bg-brand/10 text-brand-300",
  };
}

function MetricCard({ label, value, sub, tone = "brand", icon }) {
  const toneClass = {
    brand: "from-brand/22 text-brand-300 ring-brand/20",
    gold: "from-gold/20 text-gold-300 ring-gold/20",
    sky: "from-sky/18 text-sky ring-sky/20",
    emerald: "from-emerald/18 text-emerald ring-emerald/20",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[.07] bg-ink-850/90 p-4 shadow-card">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${toneClass.split(" ")[0]} to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-mist/75">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-cream">
            {value}
          </p>
          <p className="mt-1 text-xs text-mist">{sub}</p>
        </div>
        <div
          className={`grid h-10 w-10 place-items-center rounded-lg bg-white/[.05] ring-1 ${toneClass.split(" ").slice(1).join(" ")}`}
        >
          <Icon d={icon} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, tone }) {
  const width = Math.min(100, max ? (value / max) * 100 : 0);
  const color = {
    thapi: "from-brand/75 to-brand",
    dhoom: "from-sky/75 to-sky",
    new: "from-gold/75 to-gold",
  }[tone];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-cream">{label}</span>
        <span className="font-mono font-semibold tabular-nums text-cream">
          {value}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-white/[.05]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <button
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/[.08] bg-ink-900 shadow-[0_24px_80px_rgba(0,0,0,.5)] animate-rise max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.2em] text-mist">
                Update Inventory
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                {size} {label}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream"
              aria-label="Close modal"
            >
              <Icon d={I.x} className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {paneType === "old" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wider text-mist">
                    Thapi
                  </span>
                  <input
                    type="number"
                    value={thapi}
                    onChange={(event) => setThapi(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 font-mono text-lg text-cream focus:border-brand/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wider text-mist">
                    Dhoom
                  </span>
                  <input
                    type="number"
                    value={dhoom}
                    onChange={(event) => setDhoom(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 font-mono text-lg text-cream focus:border-brand/50 focus:outline-none"
                  />
                </label>
              </div>
            ) : (
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">
                  New Pane Count
                </span>
                <input
                  type="number"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 font-mono text-lg text-cream focus:border-brand/50 focus:outline-none"
                />
              </label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">
                  Brought By
                </span>
                <input
                  type="text"
                  value={broughtBy}
                  onChange={(event) => setBroughtBy(event.target.value)}
                  placeholder="Name"
                  className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream placeholder:text-ink-500 focus:border-brand/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">
                  Brought Date
                </span>
                <input
                  type="date"
                  value={broughtAt}
                  onChange={(event) => setBroughtAt(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream focus:border-brand/50 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-mist hover:text-cream"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-300 disabled:opacity-50"
            >
              <Icon d={I.check} className="h-4 w-4" />
              {saving ? "Saving..." : "Save Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Skeleton = () => (
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

function PaneCard({ size, paneType, item, max, onEdit, onReset }) {
  const total = (Number(item.thapi) || 0) + (Number(item.dhoom) || 0);
  const status = getStatus(total);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/[.07] bg-ink-850/90 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-white/[.12] hover:shadow-lift">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(220,38,38,.14),transparent_55%)] opacity-70" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-mist">
              Dhol Pane Size
            </p>
            <h3 className="mt-1 font-display text-4xl font-semibold tracking-tight">
              {size}
            </h3>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
          >
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

        <div className="mt-5 rounded-lg border border-white/[.06] bg-ink-950/55 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-mist">Total Stock</span>
            <span className="font-display text-2xl font-semibold tabular-nums">
              {total}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-mist">
            <div>
              <p className="uppercase tracking-[.14em] text-mist/60">Updated</p>
              <p className="mt-1 text-cream/85">{fmtDate(item.arrived)}</p>
            </div>
            <div>
              <p className="uppercase tracking-[.14em] text-mist/60">
                Brought By
              </p>
              <p className="mt-1 truncate text-cream/85">
                {item.broughtBy || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onEdit(paneType, size)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[.06] px-3 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-white/[.1]"
          >
            <Icon d={I.sliders} className="h-4 w-4" />
            Update
          </button>
          {paneType === "new" && (
            <button
              onClick={() => onReset(paneType, size)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand-300 transition-colors hover:bg-brand/20"
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
          <p className="text-[10px] uppercase tracking-[.2em] text-brand-300">
            {paneType === "old" ? "Existing Stock" : "Fresh Stock"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-mist">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {paneType === "old" && (
            <>
              <span className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 font-semibold text-brand-300">
                Thapi {thapiTotal}
              </span>
              <span className="rounded-full border border-sky/25 bg-sky/10 px-3 py-1.5 font-semibold text-sky">
                Dhoom {dhoomTotal}
              </span>
            </>
          )}
          <span className="rounded-full border border-white/[.08] bg-white/[.045] px-3 py-1.5 font-semibold text-cream">
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

      <div className="hidden overflow-hidden rounded-xl border border-white/[.07] bg-ink-850/80 shadow-card md:block">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[.07] bg-ink-950/55">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Size
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Thapi
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Dhoom
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Total
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Updated
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
                  Brought By
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-mist">
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
                    className="cursor-pointer border-b border-white/[.05] transition-colors hover:bg-white/[.035]"
                  >
                    <td className="px-5 py-4 font-display text-lg font-semibold">
                      {size}
                    </td>
                    <td className="px-5 py-4 text-center font-mono tabular-nums">
                      {item.thapi}
                    </td>
                    <td className="px-5 py-4 text-center font-mono tabular-nums">
                      {item.dhoom}
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-bold tabular-nums">
                      {total}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-mist">
                      {fmtDate(item.arrived)}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-cream/85">
                      {item.broughtBy || "-"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                      >
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
    const { data: rows, error } = await supabase.from("dhol_pan").select("*");

    if (error || !rows || rows.length === 0) {
      if (!error && rows && rows.length === 0) {
        const seed = [
          ...Object.entries(INITIAL_OLD).map(([size, item]) =>
            toRow("old", size, item),
          ),
          ...Object.entries(INITIAL_NEW).map(([size, item]) =>
            toRow("new", size, item),
          ),
        ];
        await supabase.from("dhol_pan").insert(seed);
      }
      setOldData(INITIAL_OLD);
      setNewData(INITIAL_NEW);
    } else {
      const { old, new: nextNew } = fromRows(rows);
      setOldData(old);
      setNewData(nextNew);
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

  const openEdit = (paneType, size) => setEditModal({ paneType, size });

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
      <section className="dashboard-hero overflow-hidden rounded-xl border border-white/[.07] bg-ink-850 shadow-premium">
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulseDot" />
                Live Dhol Pane Inventory
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Dhol Pane Control Room
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
                Old pane, new pane, thapi, dhoom, brought by aur updated date ka
                premium inventory view.
              </p>
            </div>

            <div className="rounded-xl border border-white/[.07] bg-ink-950/45 p-4">
              <p className="text-[10px] uppercase tracking-[.2em] text-mist">
                Grand Inventory
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <span className="font-display text-5xl font-semibold tabular-nums">
                  {oldTotal + newTotal}
                </span>
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-lg bg-cream px-4 py-2 text-sm font-bold text-ink-950 transition-colors hover:bg-white"
                >
                  <Icon d={I.inbox} className="h-4 w-4" />
                  PDF
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-mist">
                <span className="rounded-lg bg-white/[.04] px-3 py-2">
                  Old: <b className="text-cream">{oldTotal}</b>
                </span>
                <span className="rounded-lg bg-white/[.04] px-3 py-2">
                  New: <b className="text-cream">{newTotal}</b>
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
      <section className="rounded-xl border border-white/[.07] bg-ink-850/80 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-gold-300">
              Rope Inventory
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              ढोलाची दोरी (Dori)
            </h2>
            <p className="mt-1 text-sm text-mist">
              Auto-updated when Daily Report me dori use hoti hai
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-5xl font-semibold tabular-nums text-gold-300">
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
                className="inline-flex items-center gap-2 rounded-lg bg-emerald/10 border border-emerald/25 px-4 py-2.5 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/20"
              >
                <Icon d={I.plus} className="h-4 w-4" />
                Add Dori
              </button>
              <button
                onClick={() => handleDoriUpdate(-1)}
                disabled={doriLoading || doriCount <= 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand/10 border border-brand/25 px-4 py-2.5 text-sm font-semibold text-brand-300 transition-colors hover:bg-brand/20 disabled:opacity-40"
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
                  className="mt-1 w-28 rounded-lg border border-white/[.08] bg-ink-950 px-3 py-2.5 font-mono text-lg text-cream focus:border-brand/50 focus:outline-none"
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
                  className="mt-1 w-40 rounded-lg border border-white/[.08] bg-ink-950 px-3 py-2.5 text-cream placeholder:text-ink-500 focus:border-brand/50 focus:outline-none"
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
                className="inline-flex items-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-sm font-bold text-white shadow-glow transition-all hover:bg-emerald/80 disabled:opacity-50"
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
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-mist hover:text-cream"
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
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Combined Pane Summary
            </h2>
          </div>
          <span className="rounded-full border border-white/[.08] bg-white/[.05] px-4 py-2 text-sm font-semibold">
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
                className="rounded-xl border border-white/[.07] bg-ink-950/45 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-semibold">
                    {size}
                  </span>
                  <span className="font-display text-3xl font-semibold tabular-nums text-gradient">
                    {combined}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-lg bg-brand/10 px-3 py-2 text-brand-300">
                    Old {oldSizeTotal}
                  </span>
                  <span className="rounded-lg bg-gold/10 px-3 py-2 text-gold-300">
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
