import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

/* ═══════ Constants ═══════ */
const SIZES = [30, 28, 26];
const SIZE_LABELS = { 30: '30"', 28: '28"', 26: '26"' };
const SIZE_COLORS = {
  30: "bg-gold/15 text-gold border-gold/30",
  28: "bg-sky/15 text-sky border-sky/30",
  26: "bg-coral/15 text-coral border-coral/30",
};
const MAINTENANCE_TYPES = [
  "Normal Dhol",
  "Dhoom Change",
  "Thapi Change",
  "Dori Change",
  "Dhoom & Dori Change",
  "Thapi & Dori Change",
  "Dhoom & Thapi Change",
  "Full Overhaul",
];
const LOCAL_KEY_SESSIONS = "taal_dhol_sessions_v2";

/* ═══════ Utility Functions ═══════ */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function daysAgo(d) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}
function statusInfo(lastDate) {
  const days = daysAgo(lastDate);
  if (days === Infinity) return { label: "Never", color: "bg-ink-600 text-mist", dot: "bg-ink-500", text: "text-mist", key: "never" };
  if (days > 13) return { label: `${days}d ago`, color: "bg-brand/15 text-brand-300 border-brand/30", dot: "bg-brand animate-pulse", text: "text-brand-300", key: "overdue" };
  if (days >= 6) return { label: `${days}d ago`, color: "bg-gold/15 text-gold border-gold/30", dot: "bg-gold", text: "text-gold", key: "due" };
  return { label: `${days}d ago`, color: "bg-emerald/15 text-emerald border-emerald/30", dot: "bg-emerald", text: "text-emerald", key: "ok" };
}
function statusKey(lastDate) {
  const days = daysAgo(lastDate);
  if (days === Infinity) return "never";
  if (days > 13) return "overdue";
  if (days >= 6) return "due";
  return "ok";
}

/* ═══════ Animated Value ═══════ */
function AnimatedValue({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const dur = 800, start = performance.now(), startVal = display;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(startVal + (target - startVal) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{display}</span>;
}

/* ═══════ Skeleton Loader ═══════ */
const Skeleton = () => (
  <div className="space-y-5 animate-rise">
    <div className="card h-40 shimmer rounded-xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="card h-28 shimmer rounded-xl" />)}
    </div>
  </div>
);

/* ═══════ Dhol Card (Session Grid) ═══════ */
function DholCard({ dhol, isDone, lastMaintenance, onClick }) {
  const status = statusInfo(lastMaintenance);
  return (
    <button
      onClick={() => onClick(dhol)}
      className={`card-premium p-4 text-left transition-all duration-300 group relative overflow-hidden flex flex-col justify-between min-h-[130px] sm:min-h-[140px]
        ${isDone
          ? "ring-2 ring-emerald/40 bg-emerald/[.04] hover:-translate-y-0.5"
          : "hover:-translate-y-1"
        }`}
    >
      {/* Left accent bar */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isDone ? "bg-emerald" : status.dot}`} />

      {/* Done checkmark overlay */}
      {isDone && (
        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald grid place-items-center shadow-lg">
          <Icon d={I.check} className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div>
        <div className="flex items-start justify-between pr-6">
          <span className="font-display text-2xl font-bold tabular-nums text-cream group-hover:text-brand-300 transition-colors">
            #{dhol.dhol_number}
          </span>
          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SIZE_COLORS[dhol.size]}`}>
            {SIZE_LABELS[dhol.size]}
          </span>
        </div>
        <p className="text-[11px] text-mist mt-2 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </p>
      </div>

      <div className="mt-auto pt-2 border-t border-white/[.06]">
        <span className={`text-[11px] font-medium ${isDone ? "text-emerald" : "text-mist group-hover:text-cream"} transition-colors`}>
          {isDone ? "✓ Done" : "Tap to Record →"}
        </span>
      </div>
    </button>
  );
}

/* ═══════ Maintenance Record Form (Modal Popup) ═══════ */
function RecordModal({ dhol, sessionDate, onRecord, onClose }) {
  const [description, setDescription] = useState("Normal Dhol");
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name1.trim()) return;
    setSaving(true);
    await onRecord(dhol.id, {
      maintenance_date: sessionDate,
      description,
      done_by: name1.trim(),
      done_by_2: name2.trim() || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-premium p-5 sm:p-6 w-full max-w-md space-y-5 animate-rise shadow-lift">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

        {/* Header with Dhol Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/25 grid place-items-center">
              <span className="font-display text-lg font-bold text-brand-300">#{dhol.dhol_number}</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-semibold text-cream">Record Maintenance</h2>
              <p className="text-xs text-mist mt-0.5">मेंटेनन्स रेकॉर्ड करा</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream transition-colors">
            <Icon d={I.x} className="w-4 h-4" />
          </button>
        </div>

        {/* Dhol Details Badge (auto-filled, read-only display) */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[.03] border border-white/[.08]">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-mist uppercase tracking-wider">Dhol Number</p>
            <p className="font-display text-xl font-bold text-cream mt-0.5">#{dhol.dhol_number}</p>
          </div>
          <div className="w-px h-10 bg-white/[.08]" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-mist uppercase tracking-wider">Size</p>
            <p className="font-display text-xl font-bold text-cream mt-0.5">{SIZE_LABELS[dhol.size]}</p>
          </div>
          <div className="w-px h-10 bg-white/[.08]" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-mist uppercase tracking-wider">Date</p>
            <p className="text-sm font-semibold text-cream mt-1">{fmtDate(sessionDate)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Maintenance Type */}
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">Maintenance Type *</span>
            <select
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
            >
              {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          {/* Technician Name 1 (Mandatory) */}
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">
              Technician Name 1 — किसने बनाया (Mandatory) *
            </span>
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="e.g. Rahul Pathak"
              autoFocus
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              required
            />
          </label>

          {/* Technician Name 2 (Optional) */}
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">
              Technician Name 2 — (Optional)
            </span>
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="Optional second person"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name1.trim()}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_24px_rgba(220,38,38,.3)] disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "✓ Save Maintenance Record"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════ Session Start Modal ═══════ */
function SessionStartModal({ onStart, onClose }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleStart = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onStart({ name: name.trim(), date, startTime: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-premium p-5 sm:p-6 w-full max-w-sm space-y-5 animate-rise shadow-lift">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/25 text-brand-300 grid place-items-center">
              <Icon d={I.sliders} className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-display font-semibold text-cream">Start Work Session</h2>
              <p className="text-[11px] text-mist">नवीन मेंटेनन्स सेशन सुरू करा</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream transition-colors">
            <Icon d={I.x} className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">Lead Technician Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sanket Dada"
              autoFocus
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">Session Date *</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
              required
            />
          </label>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm text-mist hover:text-cream border border-white/[.07] hover:bg-white/[.04] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(220,38,38,.25)] disabled:opacity-50 transition-all">
              🚀 Start Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════ Past Session Card (Collapsed History) ═══════ */
function PastSessionCard({ session, onExpand, expanded }) {
  const recordCount = session.records?.length || 0;
  return (
    <div className="card-premium overflow-hidden transition-all duration-300">
      <button
        onClick={() => onExpand(session.id)}
        className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-white/[.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 grid place-items-center shrink-0">
            <Icon d={I.calendar} className="w-4.5 h-4.5 text-brand-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cream truncate">{session.name}</p>
            <p className="text-xs text-mist mt-0.5">{fmtDate(session.date)} • {fmtTime(session.startTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-semibold">
            <Icon d={I.check} className="w-3 h-3" />
            {recordCount} Dhols
          </span>
          <svg className={`w-4 h-4 text-mist transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded records table */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 animate-rise">
          <div className="border-t border-white/[.06] pt-3" />
          {recordCount === 0 ? (
            <p className="text-sm text-mist text-center py-4">No records in this session.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[.08]">
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">#</th>
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">Dhol</th>
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">Size</th>
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">Type</th>
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">Name 1</th>
                    <th className="text-left py-2 px-2 text-mist font-semibold uppercase tracking-wider">Name 2</th>
                  </tr>
                </thead>
                <tbody>
                  {(session.records || []).map((r, idx) => (
                    <tr key={idx} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                      <td className="py-2.5 px-2 text-mist">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-cream">#{r.dhol_number}</td>
                      <td className="py-2.5 px-2 text-cream">{r.dhol_size || "—"}</td>
                      <td className="py-2.5 px-2 text-cream">{r.description}</td>
                      <td className="py-2.5 px-2 text-cream font-medium">{r.done_by}</td>
                      <td className="py-2.5 px-2 text-mist">{r.done_by_2 || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════ High-Definition White PDF ═══════ */
async function downloadPDF(records, sessionName, sessionDate, dhols) {
  const dateStr = fmtDate(sessionDate || new Date());
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;";

  container.innerHTML = `
    <div>
      <div style="text-align:center;margin-bottom:24px;">
        <img src="/taal-pathak-logo-red.png" style="height:75px;width:auto;margin:0 auto 12px;display:block;" />
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;">Dhol Maintenance Report</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-weight:500;">Session: ${sessionName || "All Records"} — ${dateStr}, ${timeStr}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;">Dhols Maintained</div>
          <div style="font-size:32px;font-weight:700;color:#111827;margin-top:6px;">${records.length}</div>
        </div>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;">Lead Technician</div>
          <div style="font-size:22px;font-weight:700;color:#111827;margin-top:8px;text-transform:capitalize;">${sessionName || "TAAL Team"}</div>
        </div>
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:12px;color:#DC2626;font-weight:600;text-transform:uppercase;">Total Fleet Size</div>
          <div style="font-size:32px;font-weight:700;color:#DC2626;margin-top:6px;">${dhols.length} Dhols</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #E5E7EB;">
        <thead>
          <tr style="background:#111827;color:#FFF;">
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;width:36px;">#</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Dhol</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Size</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">Maintenance Type</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">Name 1 / किसने बनाया</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">Name 2</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => `
            <tr style="background:#FFF;border-bottom:1px solid #E5E7EB;">
              <td style="padding:11px 10px;text-align:center;color:#6B7280;font-weight:600;border:1px solid #E5E7EB;">${i + 1}</td>
              <td style="padding:11px 10px;text-align:center;color:#111827;font-weight:700;font-family:monospace;border:1px solid #E5E7EB;">#${r.dhol_number || "—"}</td>
              <td style="padding:11px 10px;text-align:center;color:#374151;font-weight:600;border:1px solid #E5E7EB;">${r.dhol_size || "—"}</td>
              <td style="padding:11px 12px;text-align:left;color:#374151;border:1px solid #E5E7EB;">${r.description || "Normal Dhol"}</td>
              <td style="padding:11px 12px;text-align:left;color:#111827;font-weight:600;border:1px solid #E5E7EB;">${r.done_by || "—"}</td>
              <td style="padding:11px 12px;text-align:left;color:#6B7280;border:1px solid #E5E7EB;">${r.done_by_2 || "—"}</td>
              <td style="padding:11px 10px;text-align:center;color:#4B5563;border:1px solid #E5E7EB;">${fmtDate(r.maintenance_date)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div style="margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;">
        <div>TAAL PATHAK Operations CRM — Official Maintenance Document</div>
        <div>Page Report</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  try {
    const images = container.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth !== 0) resolve();
            else {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 2500);
            }
          })
      )
    );

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#FFFFFF", logging: false });
    const imgData = canvas.toDataURL("image/png");
    const imgW = 210, pageH = 297;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    let left = imgH, pos = 0;
    pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
    left -= pageH;
    while (left > 0) { pos = left - imgH; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH); left -= pageH; }
    pdf.save(`TAAL_Dhol_Maintenance_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) { console.error("PDF error:", err); }
  finally { document.body.removeChild(container); }
}

/* ═══════════════════════════════════════════
   MAIN — DholMaintenance Component
   ═══════════════════════════════════════════ */
export default function DholMaintenance() {
  const [dhols, setDhols] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session state
  const [session, setSession] = useState(null);          // { name, date, startTime }
  const [sessionRecords, setSessionRecords] = useState([]); // records made THIS session
  const [showStartModal, setShowStartModal] = useState(false);

  // Past sessions (localStorage + Supabase)
  const [pastSessions, setPastSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);

  // Filters (active during session)
  const [sizeFilter, setSizeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState("");

  // Record modal
  const [recordDhol, setRecordDhol] = useState(null);

  const localIdRef = useRef(5000);

  // Fallback dhols
  const fallbackDhols = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 54; i++) {
      let size = i <= 10 ? 30 : i <= 52 ? 28 : 26;
      list.push({ id: i, dhol_number: i, size, maker_name: null, notes: null });
    }
    return list;
  }, []);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dholsRes, maintRes] = await Promise.all([
        supabase.from("dhols").select("*").order("dhol_number"),
        supabase.from("dhol_maintenance").select("*").order("maintenance_date", { ascending: false }),
      ]);
      setDhols(!dholsRes.error && Array.isArray(dholsRes.data) && dholsRes.data.length > 0 ? dholsRes.data : fallbackDhols);
      setMaintenance(!maintRes.error && Array.isArray(maintRes.data) ? maintRes.data : []);
    } catch {
      setDhols(fallbackDhols);
      setMaintenance([]);
    } finally {
      setLoading(false);
    }
  }, [fallbackDhols]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load past sessions from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY_SESSIONS) || "[]");
      if (Array.isArray(saved)) setPastSessions(saved);
    } catch { /* ignore */ }
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("dhol-maint-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dhol_maintenance" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  // Lookup map
  const maintByDhol = useMemo(() => {
    const m = {};
    maintenance.forEach(r => { (m[r.dhol_id] ||= []).push(r); });
    return m;
  }, [maintenance]);

  // Stats
  const stats = useMemo(() => {
    let ok = 0, due = 0, overdue = 0, never = 0;
    dhols.forEach(d => {
      const recs = maintByDhol[d.id] || [];
      const last = recs.length > 0 ? recs[0].maintenance_date : null;
      const k = statusKey(last);
      if (k === "ok") ok++; else if (k === "due") due++; else if (k === "overdue") overdue++; else never++;
    });
    return { ok, due, overdue, never, total: dhols.length };
  }, [dhols, maintByDhol]);

  // Session done set
  const sessionDoneSet = useMemo(() => new Set(sessionRecords.map(r => r.dhol_id)), [sessionRecords]);

  // Filtered dhols (during session)
  const filteredDhols = useMemo(() => {
    return dhols.filter(d => {
      if (sizeFilter && d.size !== sizeFilter) return false;
      if (statusFilter) {
        const recs = maintByDhol[d.id] || [];
        const last = recs.length > 0 ? recs[0].maintenance_date : null;
        if (statusKey(last) !== statusFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!String(d.dhol_number).includes(q) && !(d.maker_name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [dhols, sizeFilter, statusFilter, search, maintByDhol]);

  /* ─── Record Maintenance (during session) ─── */
  const recordMaintenance = async (dholId, data) => {
    const dhol = dhols.find(d => d.id === dholId);
    const tempId = localIdRef.current++;

    // Add to session records (local tracking)
    const sessionRec = {
      id: tempId,
      dhol_id: dholId,
      dhol_number: dhol?.dhol_number || "?",
      dhol_size: dhol ? SIZE_LABELS[dhol.size] : "—",
      ...data,
    };
    setSessionRecords(prev => [...prev, sessionRec]);

    // Add to global maintenance state
    const maintRec = { id: tempId, dhol_id: dholId, ...data, created_at: new Date().toISOString() };
    setMaintenance(prev => [maintRec, ...prev]);

    // Save to Supabase
    try {
      await supabase.from("dhol_maintenance").insert({
        dhol_id: dholId,
        dhol_number: dhol?.dhol_number || null,
        dhol_size: dhol ? SIZE_LABELS[dhol.size] : null,
        maintenance_date: data.maintenance_date,
        description: data.description,
        done_by: data.done_by,
        done_by_2: data.done_by_2 || null,
      });
    } catch (err) {
      console.warn("Supabase insert error (maintenance):", err);
    }
  };

  /* ─── Start Session ─── */
  const startSession = (sessionData) => {
    setSession(sessionData);
    setSessionRecords([]);
    setSizeFilter(null);
    setStatusFilter(null);
    setSearch("");
    setShowStartModal(false);
  };

  /* ─── End Session ─── */
  const endSession = () => {
    if (!session) return;

    const completedSession = {
      id: Date.now(),
      name: session.name,
      date: session.date,
      startTime: session.startTime,
      endTime: new Date().toISOString(),
      records: [...sessionRecords],
    };

    // Save to localStorage
    const updated = [completedSession, ...pastSessions].slice(0, 100);
    setPastSessions(updated);
    try { localStorage.setItem(LOCAL_KEY_SESSIONS, JSON.stringify(updated)); } catch { /* ignore */ }

    // Clear session
    setSession(null);
    setSessionRecords([]);
  };

  /* ─── Download PDF for a specific session or all ─── */
  const handleDownloadPDF = (targetSession) => {
    if (targetSession) {
      downloadPDF(targetSession.records || [], targetSession.name, targetSession.date, dhols);
    } else if (session && sessionRecords.length > 0) {
      downloadPDF(sessionRecords, session.name, session.date, dhols);
    } else {
      // Download all maintenance records
      const allRecs = maintenance.slice(0, 60).map(r => {
        const d = dhols.find(x => x.id === r.dhol_id);
        return { ...r, dhol_number: d?.dhol_number || "?", dhol_size: d ? SIZE_LABELS[d.size] : "—" };
      });
      downloadPDF(allRecs, "All Records", new Date(), dhols);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-5 animate-rise">

      {/* ═══════ HERO HEADER ═══════ */}
      <section className="dashboard-hero overflow-hidden rounded-xl border border-white/[.08] bg-ink-900/90 shadow-premium-xl">
        <div className="p-5 sm:p-7">
          {/* Top badge */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulseDot" />
              Dhol Maintenance
            </span>
            {session && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1 text-[11px] font-semibold text-emerald animate-rise">
                <span className="h-2 w-2 rounded-full bg-emerald animate-ping" />
                Live Session: {session.name}
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-cream">
            ढोल मेंटेनन्स — Fleet Maintenance Control
          </h1>
          <p className="mt-2 text-sm text-mist max-w-xl">
            {session
              ? `Session active since ${fmtTime(session.startTime)} — Tap any dhol card to record maintenance.`
              : "Start a new work session to begin recording dhol maintenance. Past sessions are saved below."}
          </p>

          {/* ─── 3 Buttons Row: Start (left) | End (middle) | PDF (right) ─── */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* LEFT — Start Session */}
            {!session ? (
              <button
                onClick={() => setShowStartModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_28px_rgba(220,38,38,.35)] hover:-translate-y-0.5 transition-all order-1"
              >
                <Icon d={I.sliders} className="w-4 h-4" />
                Start Work Session
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald/10 border border-emerald/25 text-emerald text-sm font-semibold order-1">
                <span className="h-2 w-2 rounded-full bg-emerald animate-ping" />
                Session: {session.name}
                <span className="text-mist text-xs ml-1">({sessionRecords.length} done)</span>
              </div>
            )}

            {/* MIDDLE — End Session */}
            {session && (
              <button
                onClick={endSession}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-coral/40 bg-coral/10 text-coral text-sm font-semibold hover:bg-coral/20 hover:border-coral/60 transition-all order-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                End Session & Save
              </button>
            )}

            {/* RIGHT — Download PDF */}
            <button
              onClick={() => handleDownloadPDF(null)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[.1] bg-white/[.04] text-cream text-sm font-semibold hover:bg-white/[.08] transition-all sm:ml-auto order-3"
            >
              <svg className="w-4 h-4 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ STAT CARDS (Always Visible) ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium relative min-h-[110px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Total Fleet</p>
              <p className="mt-2 font-display text-3xl font-semibold text-cream tabular-nums"><AnimatedValue value={stats.total} /></p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.05] text-gold-300">
              <Icon d={I.briefcase} className="w-5 h-5" />
            </span>
          </div>
        </div>
        <div className="card-premium relative min-h-[110px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">OK / Fresh</p>
              <p className="mt-2 font-display text-3xl font-semibold text-emerald tabular-nums"><AnimatedValue value={stats.ok} /></p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald">
              <Icon d={I.check} className="w-5 h-5" />
            </span>
          </div>
        </div>
        <div className="card-premium relative min-h-[110px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Due Soon</p>
              <p className="mt-2 font-display text-3xl font-semibold text-gold-300 tabular-nums"><AnimatedValue value={stats.due} /></p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold-300">
              <Icon d={I.calendar} className="w-5 h-5" />
            </span>
          </div>
        </div>
        <div className="card-premium relative min-h-[110px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Attention</p>
              <p className="mt-2 font-display text-3xl font-semibold text-brand-300 tabular-nums"><AnimatedValue value={stats.overdue + stats.never} /></p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-300">
              <Icon d={I.bell} className="w-5 h-5" />
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ SESSION ACTIVE — Filters + Dhol Grid ═══════ */}
      {session && (
        <>
          {/* Session Progress Bar */}
          <div className="card-glass p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-mist">Session Progress:</span>
              <div className="w-40 h-2 rounded-full bg-white/[.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-emerald transition-all duration-500"
                  style={{ width: `${Math.min((sessionDoneSet.size / dhols.length) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-cream font-semibold">{sessionDoneSet.size}/{dhols.length}</span>
            </div>
            <span className="text-xs text-mist">{fmtDate(session.date)}</span>
          </div>

          {/* Filters */}
          <div className="card-glass p-4 flex flex-col md:flex-row gap-3 items-start md:items-center md:justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setSizeFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!sizeFilter ? "bg-brand/15 text-brand-300 border border-brand/25" : "bg-white/[.04] text-mist hover:text-cream border border-white/[.07]"}`}>
                All ({stats.total})
              </button>
              {SIZES.map(s => (
                <button key={s} onClick={() => setSizeFilter(sizeFilter === s ? null : s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sizeFilter === s ? "bg-brand/15 text-brand-300 border border-brand/25" : "bg-white/[.04] text-mist hover:text-cream border border-white/[.07]"}`}>
                  {SIZE_LABELS[s]} ({dhols.filter(d => d.size === s).length})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setStatusFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!statusFilter ? "bg-white/[.1] text-cream border border-white/[.15]" : "bg-white/[.04] text-mist hover:text-cream border border-white/[.07]"}`}>
                All Health
              </button>
              {[
                { key: "ok", label: "OK", dotClass: "bg-emerald" },
                { key: "due", label: "Due", dotClass: "bg-gold" },
                { key: "overdue", label: "Overdue", dotClass: "bg-brand" },
              ].map(f => (
                <button key={f.key} onClick={() => setStatusFilter(statusFilter === f.key ? null : f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === f.key ? `bg-${f.key === "ok" ? "emerald" : f.key === "due" ? "gold" : "brand"}/15 text-${f.key === "ok" ? "emerald" : f.key === "due" ? "gold" : "brand-300"} border border-${f.key === "ok" ? "emerald" : f.key === "due" ? "gold" : "brand"}/25` : "bg-white/[.04] text-mist hover:text-cream border border-white/[.07]"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dotClass}`} />
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-56">
              <Icon d={I.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search # or name..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-ink-950/80 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-cream">
                  <Icon d={I.x} className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dhol Grid */}
          {filteredDhols.length === 0 ? (
            <div className="card-premium p-14 text-center">
              <Icon d={I.search} className="w-8 h-8 text-mist/40 mx-auto mb-3" />
              <p className="text-mist text-sm">No dhols match filters.</p>
              <button onClick={() => { setSizeFilter(null); setStatusFilter(null); setSearch(""); }} className="text-xs text-brand-300 hover:text-brand font-medium mt-2">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredDhols.map(dhol => {
                const recs = maintByDhol[dhol.id] || [];
                const lastDate = recs.length > 0 ? recs[0].maintenance_date : null;
                return (
                  <DholCard
                    key={dhol.id}
                    dhol={dhol}
                    isDone={sessionDoneSet.has(dhol.id)}
                    lastMaintenance={lastDate}
                    onClick={d => setRecordDhol(d)}
                  />
                );
              })}
            </div>
          )}

          {/* Session summary bar */}
          {sessionRecords.length > 0 && (
            <div className="card-glass p-4 flex flex-wrap items-center gap-4 text-xs text-mist">
              <span>This session: <strong className="text-cream">{sessionRecords.length}</strong> dhols maintained</span>
              <span className="text-ink-500">|</span>
              <span>Types: {[...new Set(sessionRecords.map(r => r.description))].join(", ")}</span>
            </div>
          )}
        </>
      )}

      {/* ═══════ PAST SESSIONS HISTORY (when no session active) ═══════ */}
      {!session && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-cream flex items-center gap-2">
              <Icon d={I.calendar} className="w-5 h-5 text-brand-300" />
              Past Sessions
            </h2>
            <span className="text-xs text-mist">{pastSessions.length} sessions saved</span>
          </div>

          {pastSessions.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <Icon d={I.inbox} className="w-8 h-8 text-mist/40 mx-auto mb-3" />
              <p className="text-mist text-sm">No past sessions yet.</p>
              <p className="text-xs text-ink-500 mt-1">Start a work session to begin recording maintenance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastSessions.map(s => (
                <PastSessionCard
                  key={s.id}
                  session={s}
                  expanded={expandedSession === s.id}
                  onExpand={id => setExpandedSession(expandedSession === id ? null : id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════ MODALS ═══════ */}
      {recordDhol && session && (
        <RecordModal
          dhol={recordDhol}
          sessionDate={session.date}
          onRecord={recordMaintenance}
          onClose={() => setRecordDhol(null)}
        />
      )}

      {showStartModal && (
        <SessionStartModal
          onStart={startSession}
          onClose={() => setShowStartModal(false)}
        />
      )}
    </div>
  );
}
