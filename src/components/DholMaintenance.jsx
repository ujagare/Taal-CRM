import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TOTAL_DHOLS = 54;
const HISTORY_DAYS = 60;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function getStatusColor(logs) {
  if (!logs || logs.length === 0) return "none";
  const today = new Date().toDateString();
  const hasToday = logs.some(l => new Date(l.maintenance_date).toDateString() === today);
  if (hasToday) return "today";
  const days = daysAgo(logs[0]?.maintenance_date);
  if (days === null) return "none";
  if (days <= 7) return "recent";
  if (days <= 30) return "old";
  return "stale";
}

/* ─────────────────────────────────────────────
   ADD MAINTENANCE MODAL
───────────────────────────────────────────── */
function AddMaintenanceModal({ dhol, onSave, onClose }) {
  const [doneBy, setDoneBy] = useState("");
  const [doneBy2, setDoneBy2] = useState("");
  const [description, setDescription] = useState("Normal Dhol");
  const [maintenanceDate, setMaintenanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!doneBy.trim()) { setError("Pehla naam zaroori hai!"); return; }
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("dhol_maintenance").insert({
      dhol_id: dhol.id,
      dhol_number: dhol.dhol_number,
      dhol_size: String(dhol.size),
      maintenance_date: maintenanceDate,
      description: description.trim() || "Normal Dhol",
      done_by: doneBy.trim(),
      done_by_2: doneBy2.trim() || null,
    });

    setSaving(false);
    if (err) { setError("Save nahi hua: " + err.message); return; }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[.08] bg-ink-900 shadow-[0_24px_80px_rgba(0,0,0,.6)] animate-rise">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.2em] text-mist">Dhol #{dhol.dhol_number}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-cream">
                Maintenance Add Karo
              </h2>
              <p className="text-xs text-mist mt-1">Size: {dhol.size}" | {dhol.maker_name || "—"}</p>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream"
            >
              <Icon d={I.x} className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-mist">Maintenance Date</span>
              <input
                type="date"
                value={maintenanceDate}
                onChange={e => setMaintenanceDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream focus:border-brand/50 focus:outline-none"
              />
            </label>

            {/* Description */}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-mist">Description</span>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Normal Dhol, Pan change, Dori repair..."
                className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream placeholder:text-ink-500 focus:border-brand/50 focus:outline-none"
              />
            </label>

            {/* Done By */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">Kisne Kiya (1)*</span>
                <input
                  type="text"
                  value={doneBy}
                  onChange={e => setDoneBy(e.target.value)}
                  placeholder="Pehla naam"
                  className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream placeholder:text-ink-500 focus:border-brand/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-mist">Kisne Kiya (2)</span>
                <input
                  type="text"
                  value={doneBy2}
                  onChange={e => setDoneBy2(e.target.value)}
                  placeholder="Doosra naam (optional)"
                  className="mt-1 w-full rounded-lg border border-white/[.08] bg-ink-950 px-3 py-3 text-cream placeholder:text-ink-500 focus:border-brand/50 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-brand-300 font-medium">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-mist hover:text-cream">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-300 disabled:opacity-50"
            >
              <Icon d={I.check} className="h-4 w-4" />
              {saving ? "Saving..." : "Save Karo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DETAIL DRAWER — full 60-day history for one dhol
───────────────────────────────────────────── */
function DetailDrawer({ dhol, logs, onAdd, onClose }) {
  const sorted = useMemo(() =>
    [...logs].sort((a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date)),
    [logs]
  );

  const statusColor = getStatusColor(sorted);
  const statusBadge = {
    today: { label: "Aaj Kiya ✅", cls: "border-emerald/30 bg-emerald/10 text-emerald" },
    recent: { label: "Hafte mein", cls: "border-gold/30 bg-gold/10 text-gold-300" },
    old: { label: "Purana (30d)", cls: "border-sky/30 bg-sky/10 text-sky" },
    stale: { label: "60d+ Purana", cls: "border-brand/30 bg-brand/10 text-brand-300" },
    none: { label: "Kabhi Nahi", cls: "border-white/10 bg-white/[.04] text-mist" },
  }[statusColor];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-lg flex flex-col border-l border-white/[.08] bg-ink-950/98 backdrop-blur-2xl shadow-[-24px_0_80px_rgba(0,0,0,.7)]">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-brand/40 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[.06]">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-mist">Dhol Complete History</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-cream">#{dhol.dhol_number}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[11px] text-mist">Size: {dhol.size}"</span>
              {dhol.maker_name && (
                <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[11px] text-mist">{dhol.maker_name}</span>
              )}
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream"
          >
            <Icon d={I.x} className="h-4 w-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/[.06]">
          <div className="rounded-xl bg-brand/10 border border-brand/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-cream">{sorted.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Total Log</p>
          </div>
          <div className="rounded-xl bg-gold/10 border border-gold/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-cream">
              {sorted.length > 0 ? daysAgo(sorted[0].maintenance_date) ?? "—" : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Aaj se din</p>
          </div>
          <div className="rounded-xl bg-sky/10 border border-sky/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-cream">
              {new Set(sorted.flatMap(l => [l.done_by, l.done_by_2].filter(Boolean))).size}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Log karte hain</p>
          </div>
        </div>

        {/* Add Button */}
        <div className="px-4 py-3 border-b border-white/[.06]">
          <button
            onClick={onAdd}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-300"
          >
            <Icon d={I.plus} className="h-4 w-4" />
            Nayi Entry Add Karo
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-thin">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🥁</div>
              <p className="text-cream font-semibold">Koi record nahi</p>
              <p className="text-mist text-sm mt-1">Abhi tak koi maintenance nahi ki gayi</p>
            </div>
          ) : (
            sorted.map((log, idx) => {
              const isToday = new Date(log.maintenance_date).toDateString() === new Date().toDateString();
              return (
                <div
                  key={log.id}
                  className={`relative rounded-xl border p-4 transition-all ${
                    isToday
                      ? "border-emerald/30 bg-emerald/[.06]"
                      : idx === 0
                        ? "border-brand/20 bg-brand/[.05]"
                        : "border-white/[.06] bg-white/[.02]"
                  }`}
                >
                  {isToday && (
                    <span className="absolute top-3 right-3 rounded-full bg-emerald/20 px-2 py-0.5 text-[10px] font-bold text-emerald uppercase tracking-widest">
                      Aaj
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 border border-brand/25 font-bold text-brand-300 text-sm">
                      {sorted.length - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cream">{log.description || "Normal Dhol"}</p>
                      <p className="text-xs text-mist mt-0.5">{fmtDate(log.maintenance_date)}</p>

                      {/* Who did it */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {log.done_by && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 border border-gold/20 px-2.5 py-1 text-[11px] font-semibold text-gold-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
                            {log.done_by}
                          </span>
                        )}
                        {log.done_by_2 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/10 border border-sky/20 px-2.5 py-1 text-[11px] font-semibold text-sky">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky" />
                            {log.done_by_2}
                          </span>
                        )}
                      </div>

                      {/* Created at */}
                      {log.created_at && (
                        <p className="text-[10px] text-mist/50 mt-2">
                          Logged: {fmtDateTime(log.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer notes */}
        {dhol.notes && (
          <div className="px-4 py-3 border-t border-white/[.06]">
            <p className="text-[10px] uppercase tracking-wider text-mist mb-1">Notes</p>
            <p className="text-sm text-cream/80">{dhol.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FLIP CARD — individual dhol number card
───────────────────────────────────────────── */
function DholCard({ dhol, logs, onClick }) {
  const sorted = useMemo(() =>
    [...logs].sort((a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date)),
    [logs]
  );

  const statusColor = getStatusColor(sorted);
  const lastLog = sorted[0] || null;
  const uniquePeople = [...new Set(sorted.flatMap(l => [l.done_by, l.done_by_2].filter(Boolean)))];

  const cardAccent = {
    today:  "shadow-[0_0_22px_rgba(52,211,153,0.35)] border-emerald/35",
    recent: "shadow-[0_0_16px_rgba(245,158,11,0.25)] border-gold/30",
    old:    "shadow-[0_0_12px_rgba(14,165,233,0.20)] border-sky/25",
    stale:  "shadow-[0_0_10px_rgba(220,38,38,0.20)] border-brand/25",
    none:   "border-white/[.07]",
  }[statusColor];

  const numBg = {
    today:  "bg-emerald/15 text-emerald border-emerald/30",
    recent: "bg-gold/15 text-gold-300 border-gold/30",
    old:    "bg-sky/15 text-sky border-sky/30",
    stale:  "bg-brand/15 text-brand-300 border-brand/30",
    none:   "bg-white/[.05] text-mist border-white/[.08]",
  }[statusColor];

  return (
    <div
      className="group relative cursor-pointer"
      style={{ perspective: "800px" }}
      onClick={onClick}
    >
      <div
        className="relative transition-transform duration-500 ease-out"
        style={{ transformStyle: "preserve-3d", transform: "rotateY(0deg)" }}
      >
        {/* ── FRONT FACE ── */}
        <div
          className={`relative overflow-hidden rounded-xl border ${cardAccent} bg-ink-850/90 transition-all duration-300 group-hover:[transform:rotateY(180deg)] group-hover:opacity-0`}
          style={{ backfaceVisibility: "hidden", minHeight: "90px" }}
        >
          <div className="p-3 flex flex-col items-center justify-center h-full gap-1.5">
            <span className={`font-display text-lg font-bold tabular-nums ${numBg.split(" ").slice(1).join(" ")}`}>
              #{dhol.dhol_number}
            </span>
            <span className="text-[9px] text-mist uppercase tracking-wider">{dhol.size}"</span>
            {logs.length > 0 && (
              <span className="text-[9px] text-mist/60">{logs.length} log</span>
            )}
            {statusColor === "today" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
            )}
          </div>
        </div>

        {/* ── BACK FACE (hover flip) ── */}
        <div
          className={`absolute inset-0 overflow-hidden rounded-xl border ${cardAccent} bg-ink-900 opacity-0 transition-all duration-300 group-hover:opacity-100`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            minHeight: "90px",
          }}
        >
          <div className="p-2.5 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-cream">#{dhol.dhol_number}</span>
              {lastLog ? (
                <span className="text-[9px] text-mist">{fmtDate(lastLog.maintenance_date)}</span>
              ) : (
                <span className="text-[9px] text-mist/50">No log</span>
              )}
            </div>
            {uniquePeople.slice(0, 3).map((p, i) => (
              <span key={i} className="text-[10px] text-gold-300 truncate">• {p}</span>
            ))}
            {uniquePeople.length > 3 && (
              <span className="text-[9px] text-mist/60">+{uniquePeople.length - 3} aur</span>
            )}
            {uniquePeople.length === 0 && (
              <span className="text-[9px] text-mist/50 italic">Koi nahi</span>
            )}
            <p className="text-[9px] text-brand-300 font-semibold mt-auto">Click for full history →</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-6 animate-rise">
      <div className="h-44 rounded-xl bg-ink-850 shimmer" />
      <div className="h-12 rounded-xl bg-ink-850 shimmer" />
      <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
        {Array.from({ length: 54 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-ink-850 shimmer" />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function DholMaintenance() {
  const [dhols, setDhols] = useState([]);
  const [logs, setLogs] = useState([]); // all logs from last 60 days
  const [loading, setLoading] = useState(true);
  const [selectedDhol, setSelectedDhol] = useState(null);
  const [addingFor, setAddingFor] = useState(null); // dhol obj for AddModal
  const [filterSize, setFilterSize] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchNum, setSearchNum] = useState("");

  /* ── Load dhols + last 60 days of maintenance logs ── */
  const loadData = useCallback(async () => {
    setLoading(true);

    // 1. Load or seed dhols table
    let { data: dholsData, error: dholsErr } = await supabase
      .from("dhols")
      .select("*")
      .order("dhol_number", { ascending: true });

    if (dholsErr) {
      console.warn("Dhols load error:", dholsErr.message);
    }

    // Auto-seed 54 dhols if empty
    if (!dholsData || dholsData.length === 0) {
      const seed = Array.from({ length: TOTAL_DHOLS }, (_, i) => {
        const num = i + 1;
        let size = 28;
        if (num <= 6) size = 26;
        else if (num > 48) size = 30;
        return { dhol_number: num, size, maker_name: null, notes: null };
      });
      const { data: seeded } = await supabase.from("dhols").insert(seed).select();
      dholsData = seeded || seed.map((d, i) => ({ ...d, id: i + 1 }));
    }

    setDhols(dholsData || []);

    // 2. Load last 60 days of maintenance logs
    const since = new Date();
    since.setDate(since.getDate() - HISTORY_DAYS);

    const { data: logsData, error: logsErr } = await supabase
      .from("dhol_maintenance")
      .select("*")
      .gte("maintenance_date", since.toISOString().slice(0, 10))
      .order("maintenance_date", { ascending: false });

    if (logsErr) console.warn("Logs load error:", logsErr.message);
    setLogs(logsData || []);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Real-time subscription ── */
  useEffect(() => {
    const ch1 = supabase
      .channel("dhol-maint-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dhol_maintenance" }, loadData)
      .subscribe();
    const ch2 = supabase
      .channel("dhols-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dhols" }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [loadData]);

  /* ── Derived / filtered data ── */
  const logsByDholId = useMemo(() => {
    const map = {};
    for (const log of logs) {
      if (!map[log.dhol_id]) map[log.dhol_id] = [];
      map[log.dhol_id].push(log);
    }
    return map;
  }, [logs]);

  const filteredDhols = useMemo(() => {
    return dhols.filter(d => {
      if (filterSize !== "all" && String(d.size) !== filterSize) return false;
      if (searchNum && !String(d.dhol_number).includes(searchNum)) return false;
      if (filterStatus !== "all") {
        const dLogs = logsByDholId[d.id] || [];
        const status = getStatusColor(dLogs);
        if (filterStatus !== status) return false;
      }
      return true;
    });
  }, [dhols, filterSize, filterStatus, searchNum, logsByDholId]);

  /* ── Summary Stats ── */
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const doneToday = dhols.filter(d => {
      const dLogs = logsByDholId[d.id] || [];
      return dLogs.some(l => new Date(l.maintenance_date).toDateString() === today);
    }).length;
    const neverDone = dhols.filter(d => !(logsByDholId[d.id]?.length > 0)).length;
    const totalLogs = logs.length;
    const uniquePeople = new Set(logs.flatMap(l => [l.done_by, l.done_by_2].filter(Boolean))).size;
    return { doneToday, neverDone, totalLogs, uniquePeople };
  }, [dhols, logsByDholId, logs]);

  const selectedLogs = useMemo(() =>
    selectedDhol ? (logsByDholId[selectedDhol.id] || []) : [],
    [selectedDhol, logsByDholId]
  );

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6 animate-rise">
      {/* ═══ HERO HEADER ═══ */}
      <section className="dashboard-hero overflow-hidden rounded-xl border border-white/[.07] bg-ink-850 shadow-premium">
        <div className="relative p-5 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(220,38,38,.12),transparent_60%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_.5fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulseDot" />
                60-Day Live Tracking
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl text-cream">
                Dhol Maintenance
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
                Saare {TOTAL_DHOLS} dholों ki history — kisne kiya, kab kiya, kitni baar kiya. Hover karo flip hoga, click karo poori history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald/20 bg-emerald/10 p-3 text-center">
                <p className="font-display text-3xl font-bold text-emerald tabular-nums">{stats.doneToday}</p>
                <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Aaj Kiye</p>
              </div>
              <div className="rounded-xl border border-brand/20 bg-brand/10 p-3 text-center">
                <p className="font-display text-3xl font-bold text-brand-300 tabular-nums">{stats.neverDone}</p>
                <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Kabhi Nahi</p>
              </div>
              <div className="rounded-xl border border-gold/20 bg-gold/10 p-3 text-center">
                <p className="font-display text-3xl font-bold text-gold-300 tabular-nums">{stats.totalLogs}</p>
                <p className="text-[10px] uppercase tracking-wider text-mist mt-1">60d Logs</p>
              </div>
              <div className="rounded-xl border border-sky/20 bg-sky/10 p-3 text-center">
                <p className="font-display text-3xl font-bold text-sky tabular-nums">{stats.uniquePeople}</p>
                <p className="text-[10px] uppercase tracking-wider text-mist mt-1">Members</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEGEND ═══ */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[10px] uppercase tracking-wider text-mist font-semibold">Legend:</span>
        {[
          { color: "bg-emerald", label: "Aaj kiya" },
          { color: "bg-gold-300", label: "Is hafte" },
          { color: "bg-sky", label: "30 din mein" },
          { color: "bg-brand", label: "Purana" },
          { color: "bg-white/20", label: "Kabhi nahi" },
        ].map(({ color, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs text-mist">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* ═══ FILTERS & SEARCH ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Icon d={I.target} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist" />
          <input
            type="number"
            value={searchNum}
            onChange={e => setSearchNum(e.target.value)}
            placeholder="Dhol number dhundo..."
            className="w-full rounded-lg border border-white/[.08] bg-ink-900 pl-9 pr-3 py-2.5 text-sm text-cream placeholder:text-mist/50 focus:border-brand/50 focus:outline-none"
          />
        </div>

        {/* Size filter */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[.07] bg-ink-900 p-1">
          {["all", "26", "28", "30"].map(s => (
            <button
              key={s}
              onClick={() => setFilterSize(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                filterSize === s
                  ? "bg-brand text-white shadow-glow"
                  : "text-mist hover:text-cream"
              }`}
            >
              {s === "all" ? "Sab" : `${s}"`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[.07] bg-ink-900 p-1">
          {[
            { key: "all", label: "Sab" },
            { key: "today", label: "Aaj" },
            { key: "recent", label: "Hafte" },
            { key: "none", label: "0 Log" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === key
                  ? "bg-brand text-white shadow-glow"
                  : "text-mist hover:text-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-mist">
          {filteredDhols.length}/{dhols.length} dhol
        </span>
      </div>

      {/* ═══ DHOL NUMBER GRID ═══ */}
      <section className="rounded-xl border border-white/[.07] bg-ink-850/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-brand-300">Dhol Grid</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-cream">
              {TOTAL_DHOLS} Dhol — Hover = Flip, Click = History
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-9 md:grid-cols-9 lg:grid-cols-9 xl:grid-cols-9">
          {filteredDhols.map(dhol => (
            <DholCard
              key={dhol.id}
              dhol={dhol}
              logs={logsByDholId[dhol.id] || []}
              onClick={() => setSelectedDhol(dhol)}
            />
          ))}
        </div>

        {filteredDhols.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🥁</div>
            <p className="text-cream font-semibold">Koi dhol nahi mila</p>
            <p className="text-mist text-sm mt-1">Filter clear karo</p>
          </div>
        )}
      </section>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <section className="rounded-xl border border-white/[.07] bg-ink-850/80 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-gold-300">Recent Activity</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-cream">Aaj ki / Aakhri Activity</h2>
          </div>
          <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-xs font-semibold text-mist">
            Last 60 days
          </span>
        </div>

        <div className="space-y-2.5">
          {logs.slice(0, 15).map(log => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 hover:bg-white/[.04] cursor-pointer transition-colors"
              onClick={() => {
                const dhol = dhols.find(d => d.id === log.dhol_id);
                if (dhol) setSelectedDhol(dhol);
              }}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 border border-brand/25 font-bold text-brand-300 text-sm">
                #{log.dhol_number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-cream">{log.description || "Normal Dhol"}</span>
                  <span className="text-[10px] text-mist/50 bg-white/[.04] rounded-full px-2 py-0.5">{log.dhol_size}"</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {log.done_by && (
                    <span className="text-xs text-gold-300 font-medium">👤 {log.done_by}</span>
                  )}
                  {log.done_by_2 && (
                    <span className="text-xs text-sky font-medium">👤 {log.done_by_2}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-mist shrink-0">{fmtDate(log.maintenance_date)}</span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-mist">60 dino mein koi log nahi</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ DETAIL DRAWER ═══ */}
      {selectedDhol && (
        <DetailDrawer
          dhol={selectedDhol}
          logs={selectedLogs}
          onAdd={() => { setAddingFor(selectedDhol); setSelectedDhol(null); }}
          onClose={() => setSelectedDhol(null)}
        />
      )}

      {/* ═══ ADD MAINTENANCE MODAL ═══ */}
      {addingFor && (
        <AddMaintenanceModal
          dhol={addingFor}
          onSave={() => { loadData(); setSelectedDhol(addingFor); }}
          onClose={() => { setAddingFor(null); }}
        />
      )}
    </div>
  );
}
