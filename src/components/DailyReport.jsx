import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon, I } from "./icons";
import { supabase } from "../lib/supabase";
import { sendWhatsApp, sendAdminAlerts } from "../utils/whatsapp";

/* ═══════════════════════════════════════════════
   CONSTANTS & CONFIG
   ═══════════════════════════════════════════════ */
const todayISO = () => new Date().toISOString().slice(0, 10);
const SIZES = [30, 28, 26];
const SIZE_LABELS = { 30: '30"', 28: '28"', 26: '26"' };
const LOW_STOCK_THRESHOLD = 5;

const WORK_TYPES = [
  "Dhoom Change",
  "Thapi Change",
  "Dori Change",
  "Dhoom & Dori Change",
  "Thapi & Dori Change",
  "Dhoom & Thapi Change",
  "Pura Dhol Banaya",
  "General Maintenance",
];

const CONSUMPTION_MAP = {
  "Dhoom Change":         { dhoom: 1, thapi: 0, dori: 0 },
  "Thapi Change":         { dhoom: 0, thapi: 1, dori: 0 },
  "Dori Change":          { dhoom: 0, thapi: 0, dori: 1 },
  "Dhoom & Dori Change":  { dhoom: 1, thapi: 0, dori: 1 },
  "Thapi & Dori Change":  { dhoom: 0, thapi: 1, dori: 1 },
  "Dhoom & Thapi Change": { dhoom: 1, thapi: 1, dori: 0 },
  "Pura Dhol Banaya":     { dhoom: 1, thapi: 1, dori: 1 },
  "General Maintenance":  { dhoom: 0, thapi: 0, dori: 0 },
};

function getConsumption(workType) {
  return CONSUMPTION_MAP[workType] || { dhoom: 0, thapi: 0, dori: 0 };
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function normalizeSize(size) {
  const raw = String(size || "");
  const normalized = raw
    .replace(/[\u0966-\u096F]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
  if (normalized.includes("26")) return '26"';
  if (normalized.includes("28")) return '28"';
  if (normalized.includes("30")) return '30"';
  return normalized || '28"';
}

/* ═══════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════ */
function AnimatedCount({ value, className = "" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 700;
    const start = performance.now();
    const startVal = display;
    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    }
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <span className={className}>{display}</span>;
}

/* ═══════════════════════════════════════════════
   STAT CARD COMPONENT
   ═══════════════════════════════════════════════ */
function StatCard({ icon, label, value, suffix = "", tone = "brand", alert = false, subText = "" }) {
  const tones = {
    brand:   "from-brand/20 border-brand/25 text-brand-300",
    gold:    "from-gold/18 border-gold/25 text-gold-300",
    emerald: "from-emerald/18 border-emerald/25 text-emerald",
    sky:     "from-sky/18 border-sky/25 text-sky",
    coral:   "from-coral/18 border-coral/25 text-coral",
    cream:   "from-white/[.06] border-white/[.12] text-cream",
  };
  const t = tones[tone] || tones.brand;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-ink-850/90 p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${t.split(" ").slice(1).join(" ")} ${alert ? "ring-2 ring-brand/40 animate-pulse" : ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${t.split(" ")[0]} to-transparent`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <p className="text-[10px] uppercase tracking-[.16em] text-mist/80 font-semibold">{label}</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <AnimatedCount value={value} className="font-display text-3xl font-bold" />
          {suffix && <span className="text-xs font-semibold text-mist">{suffix}</span>}
        </div>
        {subText && <p className="text-[10px] text-mist mt-1">{subText}</p>}
        {alert && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse shadow-[0_0_8px_rgba(220,38,38,.8)]" />
            <span className="text-[10px] font-bold text-brand-300 uppercase tracking-wider">Low Stock Alert!</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   INVENTORY ROW CARD
   ═══════════════════════════════════════════════ */
function InventorySection({ title, icon, data, onEdit, editLabel = "Update", single = false }) {
  const totalCount = single ? (Number(data.count) || 0) : Object.values(data).reduce((s, v) => s + (Number(v) || 0), 0);
  const hasLowStock = single ? totalCount < LOW_STOCK_THRESHOLD : Object.values(data).some(v => (Number(v) || 0) < LOW_STOCK_THRESHOLD);

  return (
    <div className={`card-premium p-5 space-y-4 ${hasLowStock ? "ring-1 ring-brand/30" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="font-display text-base font-semibold text-cream">{title}</h3>
            <p className="text-[10px] text-mist uppercase tracking-wider">Total: <strong className="text-cream">{totalCount}</strong></p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[.1] bg-white/[.04] text-xs font-semibold text-cream hover:bg-white/[.08] transition-all"
          >
            <Icon d={I.plus} className="w-3.5 h-3.5" /> {editLabel}
          </button>
        )}
      </div>

      {single ? (
        <div className={`relative rounded-xl border p-4 text-center transition-all ${hasLowStock ? "border-brand/40 bg-brand/[.08] shadow-[0_0_20px_rgba(220,38,38,.15)]" : "border-white/[.08] bg-white/[.02]"}`}>
          {hasLowStock && (
            <div className="absolute top-2 right-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse inline-block shadow-[0_0_10px_rgba(220,38,38,.8)]" />
            </div>
          )}
          <p className={`font-display text-3xl font-bold ${hasLowStock ? "text-brand-300" : "text-cream"}`}>
            <AnimatedCount value={totalCount} />
          </p>
          {hasLowStock && <p className="text-[9px] text-brand-300 font-bold uppercase mt-1 tracking-wider">⚠️ Low</p>}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {SIZES.map(s => {
            const key = `${s}"`;
            const count = Number(data[key]) || 0;
            const isLow = count < LOW_STOCK_THRESHOLD;
            return (
              <div key={s} className={`relative rounded-xl border p-4 text-center transition-all ${isLow ? "border-brand/40 bg-brand/[.08] shadow-[0_0_20px_rgba(220,38,38,.15)]" : "border-white/[.08] bg-white/[.02]"}`}>
                {isLow && (
                  <div className="absolute top-2 right-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse inline-block shadow-[0_0_10px_rgba(220,38,38,.8)]" />
                  </div>
                )}
                <p className="text-xs text-mist font-semibold mb-1">{SIZE_LABELS[s]}</p>
                <p className={`font-display text-2xl font-bold ${isLow ? "text-brand-300" : "text-cream"}`}>
                  <AnimatedCount value={count} />
                </p>
                {isLow && <p className="text-[9px] text-brand-300 font-bold uppercase mt-1 tracking-wider">⚠️ Low</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LOW STOCK ALERT BANNER
   ═══════════════════════════════════════════════ */
function LowStockBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/[.12] via-brand/[.06] to-transparent p-4 shadow-[0_0_30px_rgba(220,38,38,.1)]">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand/20 text-brand-300">
            <span className="absolute inset-0 rounded-xl bg-brand/30 animate-ping" />
            <span className="relative text-lg">🚨</span>
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-display text-sm font-bold text-brand-300 mb-1">Low Stock Alert!</h4>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                {a.item} {a.size} — only <strong>{a.count}</strong> left
              </span>
            ))}
          </div>
          <p className="text-[10px] text-mist mt-2">WhatsApp alert bheja ja raha hai admin ko...</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   INVENTORY UPDATE MODAL
   ═══════════════════════════════════════════════ */
function InventoryModal({ title, icon, currentData, onSave, onClose, single = false }) {
  const [values, setValues] = useState({ ...currentData });
  const [updatedBy, setUpdatedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(values, updatedBy);
    setSaving(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
      <div className="relative card-premium max-h-[92vh] w-full max-w-sm space-y-5 overflow-y-auto scroll-thin rounded-b-none p-5 shadow-lift animate-rise sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-cream">{icon} {title}</h2>
          <button onClick={onClose} className="text-mist hover:text-cream"><Icon d={I.x} className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {single ? (
            <label className="block">
              <span className="text-xs text-mist uppercase tracking-wider font-medium">Total Count</span>
              <input
                type="number"
                min="0"
                value={values.count ?? 0}
                onChange={e => setValues(v => ({ ...v, count: Number(e.target.value) || 0 }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50"
              />
            </label>
          ) : (
            SIZES.map(s => {
              const key = `${s}"`;
              return (
                <label key={s} className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">{SIZE_LABELS[s]} Count</span>
                  <input
                    type="number"
                    min="0"
                    value={values[key] ?? 0}
                    onChange={e => setValues(v => ({ ...v, [key]: Number(e.target.value) || 0 }))}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50"
                  />
                </label>
              );
            })
          )}
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider font-medium">Updated By (Name)</span>
            <input
              type="text"
              value={updatedBy}
              onChange={e => setUpdatedBy(e.target.value)}
              placeholder="e.g. Rahul Modi"
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Inventory"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════
   PDF GENERATOR (HD White PDF)
   ═══════════════════════════════════════════════ */
async function generateDailyPDF(stats, panData, doriData, mainData, dateReports, attendanceStats, selectedDate) {
  const dateStr = formatDate(selectedDate || new Date());
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const brokenLogs = dateReports.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne");
  const madeLogs = dateReports.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane");

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:0;top:99999px;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;visibility:visible;display:block;";

  container.innerHTML = `
    <div>
      <!-- Logo Header -->
      <div style="text-align:center;margin-bottom:28px;">
        <img src="/taal-pathak-logo-red.png" style="height:70px;width:auto;margin:0 auto 12px;display:block;" />
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;">TAAL Pathak — Daily Operations Report</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-weight:500;">दैनिक ढोल अहवाल — ${dateStr} (${timeStr})</p>
      </div>

      <!-- 4x2 Stats Grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;color:#6B7280;font-weight:600;text-transform:uppercase;">Ready Dhols</div>
          <div style="font-size:28px;font-weight:700;color:#111827;margin-top:4px;">${stats.readyCount}</div>
        </div>
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;color:#DC2626;font-weight:600;text-transform:uppercase;">Dhol Foda (Broken)</div>
          <div style="font-size:28px;font-weight:700;color:#DC2626;margin-top:4px;">${stats.brokenCount}</div>
        </div>
        <div style="background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;color:#047857;font-weight:600;text-transform:uppercase;">Dhol Banaya (Made)</div>
          <div style="font-size:28px;font-weight:700;color:#047857;margin-top:4px;">${stats.madeCount}</div>
        </div>
        <div style="background:#F0F9FF;border:1.5px solid #93C5FD;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;color:#1D4ED8;font-weight:600;text-transform:uppercase;">Attendance</div>
          <div style="font-size:28px;font-weight:700;color:#1D4ED8;margin-top:4px;">${attendanceStats.present}/${attendanceStats.total}</div>
        </div>
      </div>

      <!-- Inventory Summary -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase;">🎯 Pan Stock</div>
          ${SIZES.map(s => {
            const key = `${s}"`;
            const val = panData[key] || 0;
            const low = val < LOW_STOCK_THRESHOLD;
            return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;"><span style="color:#374151;">${SIZE_LABELS[s]}</span><span style="font-weight:700;color:${low ? '#DC2626' : '#111827'};">${val} ${low ? '⚠️' : ''}</span></div>`;
          }).join("")}
        </div>
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase;">🧵 Dori Stock</div>
          ${(() => {
            const val = Number(doriData.count) || 0;
            const low = val < LOW_STOCK_THRESHOLD;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;"><span style="color:#374151;">Total</span><span style="font-weight:700;font-size:22px;color:${low ? '#DC2626' : '#111827'};">${val} ${low ? '⚠️' : ''}</span></div>`;
          })()}
        </div>
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase;">🔩 Main Stock</div>
          ${(() => {
            const val = Number(mainData.count) || 0;
            const low = val < LOW_STOCK_THRESHOLD;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;"><span style="color:#374151;">Total</span><span style="font-weight:700;font-size:22px;color:${low ? '#DC2626' : '#111827'};">${val} ${low ? '⚠️' : ''}</span></div>`;
          })()}
        </div>
      </div>

      <!-- Logs Table -->
      ${dateReports.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #E5E7EB;margin-bottom:20px;">
        <thead>
          <tr style="background:#111827;color:#FFF;">
            <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;width:30px;">#</th>
            <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Dhol</th>
            <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Size</th>
            <th style="padding:10px 8px;text-align:left;font-size:10px;font-weight:700;border:1px solid #111827;">Work</th>
            <th style="padding:10px 8px;text-align:left;font-size:10px;font-weight:700;border:1px solid #111827;">किसने फोड़ा</th>
            <th style="padding:10px 8px;text-align:left;font-size:10px;font-weight:700;border:1px solid #111827;">किसने बनाया</th>
            <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${dateReports.map((r, i) => `
            <tr style="background:#FFF;border-bottom:1px solid #E5E7EB;">
              <td style="padding:9px 8px;text-align:center;color:#6B7280;font-weight:600;border:1px solid #E5E7EB;">${i + 1}</td>
              <td style="padding:9px 8px;text-align:center;color:#111827;font-weight:700;font-family:monospace;border:1px solid #E5E7EB;">#${r.dholNumber || "—"}</td>
              <td style="padding:9px 8px;text-align:center;color:#374151;font-weight:600;border:1px solid #E5E7EB;">${r.dholSize ? r.dholSize + '"' : "—"}</td>
              <td style="padding:9px 8px;text-align:left;color:#374151;border:1px solid #E5E7EB;">${r.workType || r.brokenPart || "—"}</td>
              <td style="padding:9px 8px;text-align:left;color:#DC2626;font-weight:600;border:1px solid #E5E7EB;">${r.brokenBy || "—"}</td>
              <td style="padding:9px 8px;text-align:left;color:#047857;font-weight:600;border:1px solid #E5E7EB;">${r.madeBy || "—"}</td>
              <td style="padding:9px 8px;text-align:center;color:#111827;font-weight:600;border:1px solid #E5E7EB;">${r.repairStatus || "Pending"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ` : `<p style="text-align:center;color:#9CA3AF;font-size:12px;padding:20px 0;">No dhol maintenance entries for this date.</p>`}

      <!-- Footer -->
      <div style="margin-top:24px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;">
        <div>TAAL PATHAK Operations CRM — Auto-Generated Daily Report</div>
        <div>Generated: ${dateStr} ${timeStr}</div>
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

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#FFFFFF", logging: false });
    const imgData = canvas.toDataURL("image/png");
    const imgW = 210, pageH = 297;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");

    let left = imgH, pos = 0;
    pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
    left -= pageH;
    while (left > 0) {
      pos = left - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
      left -= pageH;
    }

    const filename = `TAAL_Daily_Report_${(selectedDate || todayISO()).replace(/-/g, "_")}.pdf`;
    pdf.save(filename);
    return true;
  } catch (err) {
    console.error("PDF error:", err);
    return false;
  } finally {
    document.body.removeChild(container);
  }
}

/* ═══════════════════════════════════════════════
   GENERATE WHATSAPP REPORT TEXT
   ═══════════════════════════════════════════════ */
function buildWhatsAppReportText(stats, panData, doriData, mainData, attendanceStats, dateReports, selectedDate) {
  const dateStr = formatDate(selectedDate);
  const brokenNames = dateReports
    .filter(r => r.brokenBy?.trim())
    .map(r => `  • Dhol #${r.dholNumber} — ${r.brokenBy} (${r.workType})`)
    .join("\n");
  const madeNames = dateReports
    .filter(r => r.madeBy?.trim())
    .map(r => `  • Dhol #${r.dholNumber} — ${r.madeBy} (${r.workType})`)
    .join("\n");

  const doriTotal = Number(doriData.count) || 0;
  const mainTotal = Number(mainData.count) || 0;
  const panTotal = (Number(panData['26"']) || 0) + (Number(panData['28"']) || 0) + (Number(panData['30"']) || 0);

  // Check for low stock items
  const lowItems = [];
  SIZES.forEach(s => {
    const key = `${s}"`;
    if ((Number(panData[key]) || 0) < LOW_STOCK_THRESHOLD) lowItems.push(`Pan ${SIZE_LABELS[s]}: ${panData[key] || 0}`);
  });
  if (doriTotal < LOW_STOCK_THRESHOLD) lowItems.push(`Dori: ${doriTotal}`);
  if (mainTotal < LOW_STOCK_THRESHOLD) lowItems.push(`Main: ${mainTotal}`);

  return `📊 *TAAL PATHAK — दैनिक अहवाल*
📅 *Date:* ${dateStr}

━━━━━━━━━━━━━━━━━━━━
🥁 *DHOL STATUS*
━━━━━━━━━━━━━━━━━━━━
✅ Ready Dhols: *${stats.readyCount}*
💥 Dhol Foda: *${stats.brokenCount}*
🔨 Dhol Banaya: *${stats.madeCount}*

━━━━━━━━━━━━━━━━━━━━
🎯 *PAN STOCK* (Total: ${panTotal})
━━━━━━━━━━━━━━━━━━━━
  30": *${panData['30"'] || 0}*
  28": *${panData['28"'] || 0}*
  26": *${panData['26"'] || 0}*

━━━━━━━━━━━━━━━━━━━━
🧵 *DORI STOCK*
━━━━━━━━━━━━━━━━━━━━
  Total: *${doriTotal}*

━━━━━━━━━━━━━━━━━━━━
🔩 *MAIN STOCK*
━━━━━━━━━━━━━━━━━━━━
  Total: *${mainTotal}*

━━━━━━━━━━━━━━━━━━━━
👥 *ATTENDANCE*
━━━━━━━━━━━━━━━━━━━━
Present: *${attendanceStats.present}* | Absent: *${attendanceStats.absent}*
Late: *${attendanceStats.late}* | Half Day: *${attendanceStats.halfDay}*
Total Members: *${attendanceStats.total}*

${brokenNames ? `━━━━━━━━━━━━━━━━━━━━\n💥 *किसने फोड़ा:*\n${brokenNames}\n` : ""}
${madeNames ? `━━━━━━━━━━━━━━━━━━━━\n🔨 *किसने बनाया:*\n${madeNames}\n` : ""}
${lowItems.length > 0 ? `\n🚨 *LOW STOCK ALERT:*\n${lowItems.map(l => `  ⚠️ ${l}`).join("\n")}\n` : ""}
━━━━━━━━━━━━━━━━━━━━
_TAAL Pathak CRM — Auto Report_`;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — DailyReport
   ═══════════════════════════════════════════════════ */
export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'broken', 'made', 'dori', 'main', 'pan'
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [sendingWA, setSendingWA] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Live inventory state — pan is per-size, dori & main are single counts
  const [panData, setPanData] = useState({ '26"': 0, '28"': 0, '30"': 0 });
  const [doriData, setDoriData] = useState({ count: 0 });
  const [mainData, setMainData] = useState({ count: 0 });

  // Attendance state
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, halfDay: 0, total: 0 });

  // Form states
  const emptyBroken = { dholNumber: "", dholSize: 28, workType: "Dhoom Change", brokenBy: "", notes: "" };
  const emptyMade = { dholNumber: "", dholSize: 28, workType: "Pura Dhol Banaya", madeBy: "", repairStatus: "Ready", notes: "" };
  const [brokenForm, setBrokenForm] = useState({ ...emptyBroken });
  const [madeForm, setMadeForm] = useState({ ...emptyMade });

  // Track if alert was already sent to avoid spam
  const alertSentRef = useRef(new Set());

  /* ─── FETCH: Daily Reports from Supabase ─── */
  const loadReports = useCallback(async () => {
    // Priority: Supabase > localStorage cache (never lose existing data)
    let fromRemote = false;
    try {
      const { data, error } = await supabase.from("daily_reports").select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(d => ({
          id: d.id,
          reportDate: d.report_date,
          dholNumber: d.dhol_number,
          dholSize: d.dhol_size,
          workType: d.work_type,
          brokenPart: d.broken_part,
          brokenBy: d.broken_by,
          madeBy: d.made_by,
          repairStatus: d.repair_status,
          doriStatus: d.dori_status,
          panMainStatus: d.pan_main_status,
          readyCount: d.ready_count,
          notes: d.notes,
          reportType: d.report_type,
          createdAt: d.created_at,
        }));
        setReports(mapped);
        localStorage.setItem("dr_cache_reports", JSON.stringify(mapped));
        fromRemote = true;
      }
    } catch { /* fallback */ }

    if (!fromRemote) {
      const cached = localStorage.getItem("dr_cache_reports");
      if (cached) {
        try { setReports(JSON.parse(cached)); } catch { /* corrupted cache */ }
      }
    }
  }, []);

  /* ─── FETCH: Pan Inventory from dhol_pan ─── */
  const loadPanData = useCallback(async () => {
    let fromRemote = false;
    try {
      const { data } = await supabase.from("dhol_pan").select("*").eq("pane_type", "old");
      if (data && data.length > 0) {
        const result = { '26"': 0, '28"': 0, '30"': 0 };
        data.forEach(row => {
          const size = normalizeSize(row.size);
          result[size] = (Number(row.thapi) || 0) + (Number(row.dhoom) || 0);
        });
        setPanData(result);
        localStorage.setItem("dr_cache_pan", JSON.stringify(result));
        fromRemote = true;
      }
    } catch { /* ignore */ }

    if (!fromRemote) {
      const cached = localStorage.getItem("dr_cache_pan");
      if (cached) {
        try { setPanData(JSON.parse(cached)); } catch { /* corrupted cache */ }
      }
    }
  }, []);

  /* ─── FETCH: Dori Inventory (single count — dori has no sizes) ─── */
  const loadDoriData = useCallback(async () => {
    let fromRemote = false;
    try {
      const { data } = await supabase.from("dori_inventory").select("*").limit(1);
      if (data && data.length > 0) {
        const val = Number(data[0].current_count) || 0;
        setDoriData({ count: val });
        localStorage.setItem("dr_cache_dori", JSON.stringify({ count: val }));
        fromRemote = true;
      }
    } catch { /* ignore */ }

    if (!fromRemote) {
      const cached = localStorage.getItem("dr_cache_dori");
      if (cached) {
        try { setDoriData(JSON.parse(cached)); } catch { /* corrupted cache */ }
      }
    }
  }, []);

  /* ─── FETCH: Main (Nail) Inventory (single count — nails have no sizes) ─── */
  const loadMainData = useCallback(async () => {
    let fromRemote = false;
    try {
      const { data } = await supabase.from("main_inventory").select("*");
      if (data && data.length > 0) {
        const total = data.reduce((sum, row) => sum + (Number(row.current_count) || 0), 0);
        setMainData({ count: total });
        localStorage.setItem("dr_cache_main", JSON.stringify({ count: total }));
        fromRemote = true;
      }
    } catch { /* ignore */ }

    if (!fromRemote) {
      const cached = localStorage.getItem("dr_cache_main");
      if (cached) {
        try { setMainData(JSON.parse(cached)); } catch { /* corrupted cache */ }
      }
    }
  }, []);

  /* ─── FETCH: Attendance ─── */
  const loadAttendance = useCallback(async () => {
    try {
      const { data } = await supabase.from("attendance").select("*").eq("attendance_date", selectedDate);
      if (data) {
        const present = data.filter(a => a.status === "Present").length;
        const absent = data.filter(a => a.status === "Absent").length;
        const late = data.filter(a => a.status === "Late").length;
        const halfDay = data.filter(a => a.status === "Half Day").length;
        setAttendanceStats({ present, absent, late, halfDay, total: data.length });
      }
    } catch { /* ignore */ }
  }, [selectedDate]);

  /* ─── INITIAL LOAD ─── */
  useEffect(() => {
    loadReports();
    loadPanData();
    loadDoriData();
    loadMainData();
  }, [loadReports, loadPanData, loadDoriData, loadMainData]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  /* ─── REALTIME SUBSCRIPTIONS ─── */
  useEffect(() => {
    const channels = [
      supabase.channel("dr-reports").on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => loadReports()).subscribe(),
      supabase.channel("dr-pan").on("postgres_changes", { event: "*", schema: "public", table: "dhol_pan" }, () => loadPanData()).subscribe(),
      supabase.channel("dr-dori").on("postgres_changes", { event: "*", schema: "public", table: "dori_inventory" }, () => loadDoriData()).subscribe(),
      supabase.channel("dr-main").on("postgres_changes", { event: "*", schema: "public", table: "main_inventory" }, () => loadMainData()).subscribe(),
      supabase.channel("dr-attendance").on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => loadAttendance()).subscribe(),
    ];
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, [loadReports, loadPanData, loadDoriData, loadMainData, loadAttendance]);

  /* ─── COMPUTED VALUES ─── */
  const dateReports = useMemo(() => reports.filter(r => r.reportDate === selectedDate), [reports, selectedDate]);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dateReports;
    return dateReports.filter(r =>
      [r.dholNumber, r.dholSize, r.workType, r.brokenBy, r.madeBy, r.notes].join(" ").toLowerCase().includes(q)
    );
  }, [dateReports, query]);

  const stats = useMemo(() => {
    const brokenCount = dateReports.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne").length;
    const madeCount = dateReports.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane").length;
    const readyCount = dateReports.filter(r => r.repairStatus === "Ready").length;
    return { brokenCount, madeCount, readyCount, totalLogs: dateReports.length };
  }, [dateReports]);

  /* ─── REPORTS GROUPED BY DATE (for archive view) ─── */
  const reportsByDate = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (!r.reportDate) return;
      if (!map[r.reportDate]) map[r.reportDate] = [];
      map[r.reportDate].push(r);
    });
    return Object.entries(map)
      .map(([dateName, dateReports]) => {
        const broken = dateReports.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne").length;
        const made = dateReports.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane").length;
        return { date: dateName, reports: dateReports, total: dateReports.length, broken, made };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [reports]);

  /* ─── LOW STOCK ALERTS ─── */
  const lowStockAlerts = useMemo(() => {
    const alerts = [];
    SIZES.forEach(s => {
      const key = `${s}"`;
      if ((Number(panData[key]) || 0) < LOW_STOCK_THRESHOLD) {
        alerts.push({ item: "Pan", size: SIZE_LABELS[s], count: panData[key] || 0 });
      }
    });
    if ((Number(doriData.count) || 0) < LOW_STOCK_THRESHOLD) {
      alerts.push({ item: "Dori", size: "", count: Number(doriData.count) || 0 });
    }
    if ((Number(mainData.count) || 0) < LOW_STOCK_THRESHOLD) {
      alerts.push({ item: "Main", size: "", count: Number(mainData.count) || 0 });
    }
    return alerts;
  }, [doriData, panData, mainData]);

  // Auto-send WhatsApp alert when low stock detected
  useEffect(() => {
    if (lowStockAlerts.length === 0) return;
    lowStockAlerts.forEach(alert => {
      const alertKey = `${alert.item}-${alert.size}-${alert.count}`;
      if (alertSentRef.current.has(alertKey)) return;
      alertSentRef.current.add(alertKey);

      const msg = `🚨 *LOW STOCK ALERT — TAAL PATHAK*\n\n⚠️ ${alert.item} ${alert.size} stock is LOW!\nCurrent Count: *${alert.count}*\nThreshold: *${LOW_STOCK_THRESHOLD}*\n\nPlease restock immediately!\n\n_Auto-Alert from TAAL CRM_`;
      sendAdminAlerts(msg).catch(() => {});
    });
  }, [lowStockAlerts]);

  /* ─── SAVE: Broken Dhol Log ─── */
  const handleSaveBroken = async (e) => {
    e.preventDefault();
    if (!brokenForm.dholNumber || !brokenForm.brokenBy) return;
    setSaving(true);

    try {
      await supabase.from("daily_reports").insert({
        report_date: selectedDate,
        dhol_number: brokenForm.dholNumber,
        dhol_size: String(brokenForm.dholSize),
        work_type: brokenForm.workType,
        broken_part: brokenForm.workType,
        broken_by: brokenForm.brokenBy.trim(),
        made_by: "",
        repair_status: "Pending",
        report_type: "Dhol Fodne",
        ready_count: 0,
        notes: brokenForm.notes,
      });
      showToast("✅ Broken dhol log saved!");

      // WhatsApp notification
      try {
        const msg = `📊 *TAAL Daily Report*\n\n🚨 Dhol Fodne Log:\n🥁 Dhol #${brokenForm.dholNumber} (${brokenForm.dholSize}")\n🔨 Kaam: ${brokenForm.workType}\n👤 Fodla: ${brokenForm.brokenBy}\n📅 Date: ${selectedDate}\n\nStatus: Pending`;
        sendAdminAlerts(msg).catch(() => {});
      } catch { /* ignore */ }
    } catch (err) {
      showToast("❌ Error saving: " + (err.message || "Unknown"));
    }

    setSaving(false);
    setActiveModal(null);
    setBrokenForm({ ...emptyBroken });
  };

  /* ─── SAVE: Made Dhol Log ─── */
  const handleSaveMade = async (e) => {
    e.preventDefault();
    if (!madeForm.dholNumber || !madeForm.madeBy) return;
    setSaving(true);

    try {
      await supabase.from("daily_reports").insert({
        report_date: selectedDate,
        dhol_number: madeForm.dholNumber,
        dhol_size: String(madeForm.dholSize),
        work_type: madeForm.workType,
        broken_part: madeForm.workType,
        broken_by: "",
        made_by: madeForm.madeBy.trim(),
        repair_status: madeForm.repairStatus,
        report_type: "Dhol Banane",
        ready_count: madeForm.repairStatus === "Ready" ? 1 : 0,
        notes: madeForm.notes,
      });

      // Auto-deduct Pan
      const consumption = getConsumption(madeForm.workType);
      const deducted = [];

      if (consumption.dhoom > 0 || consumption.thapi > 0) {
        try {
          const { data: panRows } = await supabase.from("dhol_pan").select("*").eq("pane_type", "old");
          if (panRows) {
            const matchRow = panRows.find(r => normalizeSize(r.size) === `${madeForm.dholSize}"`);
            if (matchRow) {
              const newDhoom = Math.max(0, (Number(matchRow.dhoom) || 0) - consumption.dhoom);
              const newThapi = Math.max(0, (Number(matchRow.thapi) || 0) - consumption.thapi);
              await supabase.from("dhol_pan").update({ dhoom: newDhoom, thapi: newThapi, arrived_at: new Date().toISOString() }).eq("id", matchRow.id);
              if (consumption.dhoom > 0) deducted.push(`Dhoom -${consumption.dhoom}`);
              if (consumption.thapi > 0) deducted.push(`Thapi -${consumption.thapi}`);
            }
          }
        } catch { /* ignore */ }
      }

      // Auto-deduct Dori (single count — size ka farak nahi padta)
      if (consumption.dori > 0) {
        try {
          const { data: oldDori } = await supabase.from("dori_inventory").select("*").limit(1);
          if (oldDori && oldDori.length > 0) {
            const newCount = Math.max(0, (Number(oldDori[0].current_count) || 0) - consumption.dori);
            await supabase.from("dori_inventory").update({ current_count: newCount, last_updated_at: new Date().toISOString(), last_updated_by: madeForm.madeBy.trim() }).eq("id", oldDori[0].id);
            deducted.push(`Dori -${consumption.dori}`);
          } else {
            await supabase.from("dori_inventory").insert({ current_count: 0, last_updated_by: madeForm.madeBy.trim() });
          }
        } catch { /* ignore */ }
      }

      showToast(deducted.length > 0 ? `✅ Saved! Inventory: ${deducted.join(", ")}` : "✅ Made log saved!");

      // WhatsApp notification
      try {
        const msg = `📊 *TAAL Daily Report*\n\n✅ Dhol Banane Log:\n🥁 Dhol #${madeForm.dholNumber} (${madeForm.dholSize}")\n🔧 Kaam: ${madeForm.workType}\n👤 Banaya: ${madeForm.madeBy}\n📅 Date: ${selectedDate}\n\n${deducted.length > 0 ? `Inventory: ${deducted.join(", ")}` : ""}`;
        sendAdminAlerts(msg).catch(() => {});
      } catch { /* ignore */ }
    } catch (err) {
      showToast("❌ Error saving: " + (err.message || "Unknown"));
    }

    setSaving(false);
    setActiveModal(null);
    setMadeForm({ ...emptyMade });
  };

  /* ─── DELETE ENTRY ─── */
  const handleDelete = async (id) => {
    try {
      await supabase.from("daily_reports").delete().eq("id", id);
      showToast("🗑️ Entry deleted");
    } catch { /* ignore */ }
  };

  /* ─── SAVE: Inventory Updates ─── */
  const handleSaveDori = async (values, updatedBy) => {
    const count = Number(values.count) || 0;
    try {
      const { data: existing } = await supabase.from("dori_inventory").select("*").limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("dori_inventory").update({
          current_count: count,
          last_updated_at: new Date().toISOString(),
          last_updated_by: updatedBy || null,
        }).eq("id", existing[0].id);
      } else {
        await supabase.from("dori_inventory").insert({
          current_count: count,
          last_updated_by: updatedBy || null,
        });
      }
    } catch { /* ignore */ }
    showToast("✅ Dori inventory updated!");
    loadDoriData();
  };

  const handleSaveMain = async (values, updatedBy) => {
    const count = Number(values.count) || 0;
    try {
      const { data: existing } = await supabase.from("main_inventory").select("*").order("id", { ascending: true });
      if (existing && existing.length > 0) {
        // Save the total against the first row and zero out the rest
        await supabase.from("main_inventory").update({
          current_count: count,
          last_updated_at: new Date().toISOString(),
          last_updated_by: updatedBy || null,
        }).eq("id", existing[0].id);
        for (let i = 1; i < existing.length; i++) {
          await supabase.from("main_inventory").update({
            current_count: 0,
            last_updated_at: new Date().toISOString(),
            last_updated_by: updatedBy || null,
          }).eq("id", existing[i].id);
        }
      } else {
        await supabase.from("main_inventory").insert({
          size: 'Total',
          current_count: count,
          last_updated_by: updatedBy || null,
        });
      }
    } catch { /* ignore */ }
    showToast("✅ Main inventory updated!");
    loadMainData();
  };

  const handleSavePan = async (values, updatedBy) => {
    // Pan data is stored as thapi+dhoom combined, we'll update thapi to be the new value
    for (const s of SIZES) {
      const key = `${s}"`;
      try {
        const { data: panRows } = await supabase.from("dhol_pan").select("*").eq("pane_type", "old");
        if (panRows) {
          const matchRow = panRows.find(r => normalizeSize(r.size) === key);
          if (matchRow) {
            // Split: set thapi to half, dhoom to half (or set thapi = new value)
            await supabase.from("dhol_pan").update({
              thapi: Math.ceil((values[key] || 0) / 2),
              dhoom: Math.floor((values[key] || 0) / 2),
              arrived_at: new Date().toISOString(),
              brought_by: updatedBy || null,
            }).eq("id", matchRow.id);
          }
        }
      } catch { /* ignore */ }
    }
    showToast("✅ Pan inventory updated!");
  };

  /* ─── SAVE: Daily Summary Snapshot ─── */
  const saveDailySummary = useCallback(async () => {
    const doriTotal = Number(doriData.count) || 0;
    try {
      await supabase.from("daily_summary_reports").upsert({
        report_date: selectedDate,
        ready_dhol_count: stats.readyCount,
        broken_count: stats.brokenCount,
        made_count: stats.madeCount,
        pan_26_count: Number(panData['26"']) || 0,
        pan_28_count: Number(panData['28"']) || 0,
        pan_30_count: Number(panData['30"']) || 0,
        dori_26_count: 0,
        dori_28_count: 0,
        dori_30_count: 0,
        main_26_count: 0,
        main_28_count: 0,
        main_30_count: 0,
        dori_total: doriTotal,
        present_count: attendanceStats.present,
        absent_count: attendanceStats.absent,
        total_members: attendanceStats.total,
      }, { onConflict: "report_date" });
    } catch { /* ignore */ }
  }, [selectedDate, stats, panData, doriData, mainData, attendanceStats]);

  // Auto-save summary whenever data changes
  useEffect(() => {
    const timer = setTimeout(() => saveDailySummary(), 2000);
    return () => clearTimeout(timer);
  }, [saveDailySummary]);

  /* ─── PDF & WHATSAPP ACTIONS ─── */
  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    const success = await generateDailyPDF(stats, panData, doriData, mainData, dateReports, attendanceStats, selectedDate);
    if (success) {
      showToast("📄 PDF downloaded!");
      // Mark as PDF generated
      try {
        await supabase.from("daily_summary_reports").update({ pdf_generated: true }).eq("report_date", selectedDate);
      } catch { /* ignore */ }
    }
    setGeneratingPdf(false);
  };

  /* ─── PDF for any specific date (from archive) ─── */
  const handleDownloadPDFForDate = async (dateISO) => {
    setGeneratingPdf(true);
    const thatDateReports = reports.filter(r => r.reportDate === dateISO);
    const thatBrokenCount = thatDateReports.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne").length;
    const thatMadeCount = thatDateReports.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane").length;
    const thatReadyCount = thatDateReports.filter(r => r.repairStatus === "Ready").length;

    // Fetch attendance for that specific date
    let thatAttendance = { present: 0, absent: 0, late: 0, halfDay: 0, total: 0 };
    try {
      const { data } = await supabase.from("attendance").select("*").eq("attendance_date", dateISO);
      if (data) {
        data.forEach(row => {
          const s = String(row.status || "").toLowerCase();
          if (s === "present") thatAttendance.present++;
          else if (s === "absent") thatAttendance.absent++;
          else if (s === "late") thatAttendance.late++;
          else if (s === "half day") thatAttendance.halfDay++;
          thatAttendance.total++;
        });
      }
    } catch { /* ignore */ }

    const success = await generateDailyPDF(
      {
        brokenCount: thatBrokenCount,
        madeCount: thatMadeCount,
        readyCount: thatReadyCount,
        totalLogs: thatDateReports.length,
      },
      panData,
      doriData,
      mainData,
      thatDateReports,
      thatAttendance,
      dateISO,
    );
    if (success) showToast(`📄 ${formatDate(dateISO)} PDF downloaded!`);
    setGeneratingPdf(false);
  };

  const handleSendWhatsApp = async () => {
    const phones = getAdminPhones();
    if (phones.length === 0) {
      showToast("⚠️ Admin phone not set! Go to Admin Panel or WhatsApp Center to set it.");
      return;
    }
    setSendingWA(true);
    const msg = buildWhatsAppReportText(stats, panData, doriData, mainData, attendanceStats, dateReports, selectedDate);
    const sentCount = await sendAdminAlerts(msg);
    if (sentCount > 0) {
      showToast(`✅ WhatsApp report sent to ${sentCount} Admin numbers!`);
      try {
        await supabase.from("daily_summary_reports").update({ whatsapp_sent: true }).eq("report_date", selectedDate);
      } catch { /* ignore */ }
    } else {
      showToast("❌ WhatsApp send failed. Check server connection.");
    }
    setSendingWA(false);
  };

  /* ─── TOAST ─── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const doriTotal = Number(doriData.count) || 0;
  const mainTotal = Number(mainData.count) || 0;
  const panTotal = (Number(panData['26"']) || 0) + (Number(panData['28"']) || 0) + (Number(panData['30"']) || 0);

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-rise">

      {/* ═══════ HERO HEADER ═══════ */}
      <section className="dashboard-hero overflow-hidden rounded-2xl border border-white/[.08] bg-ink-900/90 shadow-premium-xl">
        <div className="p-6 sm:p-8">
          {/* Top Row: Badge + Title */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-brand-300">
                  <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                  Live Daily Operations
                </span>
                <span className="rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1 text-[10px] font-semibold text-emerald uppercase tracking-wider">
                  Supabase Synced
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream">
                दैनिक ढोल अहवाल — Daily Report
              </h1>
              <p className="mt-2 text-sm text-mist max-w-xl">
                Live inventory tracking, attendance, broken/made logs, PDF export & WhatsApp delivery — all powered by Supabase.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3 sm:flex-wrap lg:w-auto">
              {/* Date Selector */}
              <div className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-white/[.1] bg-ink-950 px-3 py-2.5 sm:col-span-1 sm:justify-start">
                <span className="text-xs font-semibold uppercase text-mist">📅</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="cursor-pointer bg-transparent text-xs font-bold text-cream focus:outline-none"
                />
              </div>

              <button
                onClick={() => setActiveModal("broken")}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand-300 transition-all hover:bg-brand/20"
              >
                💥 किसने फोड़ा
              </button>

              <button
                onClick={() => setActiveModal("made")}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2.5 text-sm font-semibold text-emerald transition-all hover:bg-emerald/20"
              >
                🔨 किसने बनाया
              </button>
            </div>
          </div>

          {/* Bottom Row: PDF + WhatsApp Actions */}
          <div className="mt-5 grid grid-cols-1 gap-2 border-t border-white/[.06] pt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-300 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(220,38,38,.35)] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              {generatingPdf ? "Generating..." : "📄 Download PDF"}
            </button>

            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWA}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald to-emerald/70 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(52,211,153,.35)] disabled:opacity-50"
            >
              📱 {sendingWA ? "Sending..." : "Send WhatsApp Report"}
            </button>

            <span className="text-center text-[10px] text-mist sm:ml-auto sm:text-left">
              Auto-saves to Supabase • {dateReports.length} entries today
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ LOW STOCK ALERT BANNER ═══════ */}
      <LowStockBanner alerts={lowStockAlerts} />

      {/* ═══════ 8 STAT CARDS ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon="🥁" label="Ready Dhols" value={stats.readyCount} suffix="Ready" tone="emerald" />
        <StatCard icon="💥" label="Dhol Foda" value={stats.brokenCount} suffix="Broken" tone="brand" />
        <StatCard icon="🔨" label="Dhol Banaya" value={stats.madeCount} suffix="Made" tone="emerald" />
        <StatCard icon="👥" label="Attendance" value={attendanceStats.present} suffix={`/ ${attendanceStats.total}`} tone="sky" subText={`Late: ${attendanceStats.late} • Absent: ${attendanceStats.absent}`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon="🎯"
          label="Pan Bache (Total)"
          value={panTotal}
          suffix="Pan"
          tone="gold"
          alert={Object.values(panData).some(v => (Number(v) || 0) < LOW_STOCK_THRESHOLD)}
        />
        <StatCard
          icon="🧵"
          label="Dori (Total)"
          value={doriTotal}
          suffix="Dori"
          tone="coral"
          alert={Object.values(doriData).some(v => (Number(v) || 0) < LOW_STOCK_THRESHOLD)}
        />
        <StatCard
          icon="🔩"
          label="Main (Total)"
          value={mainTotal}
          suffix="Main"
          tone="sky"
          alert={Object.values(mainData).some(v => (Number(v) || 0) < LOW_STOCK_THRESHOLD)}
        />
        <StatCard icon="📊" label="Total Logs" value={stats.totalLogs} suffix="Entries" tone="cream" />
      </div>

      {/* ═══════ SIZE-WISE INVENTORY CARDS ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InventorySection title="Pan Inventory" icon="🎯" data={panData} onEdit={() => setActiveModal("pan")} editLabel="Update Pan" />
        <InventorySection title="Dori Inventory" icon="🧵" data={doriData} onEdit={() => setActiveModal("dori")} editLabel="Update Dori" single />
        <InventorySection title="Main (Nail) Inventory" icon="🔩" data={mainData} onEdit={() => setActiveModal("main")} editLabel="Update Main" single />
      </div>

      {/* ═══════ ATTENDANCE SUMMARY ═══════ */}
      <div className="card-premium p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xl">👥</span>
          <div>
            <h3 className="font-display text-base font-semibold text-cream">Attendance Summary — {formatDate(selectedDate)}</h3>
            <p className="text-[10px] uppercase tracking-wider text-mist">Data from attendance table</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {[
            { label: "Present", value: attendanceStats.present, color: "text-emerald border-emerald/25 bg-emerald/10" },
            { label: "Absent", value: attendanceStats.absent, color: "text-brand-300 border-brand/25 bg-brand/10" },
            { label: "Late", value: attendanceStats.late, color: "text-gold-300 border-gold/25 bg-gold/10" },
            { label: "Half Day", value: attendanceStats.halfDay, color: "text-sky border-sky/25 bg-sky/10" },
            { label: "Total", value: attendanceStats.total, color: "text-cream border-white/[.12] bg-white/[.04]" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-80 sm:text-[10px]">{label}</p>
              <p className="font-display text-xl font-bold sm:text-2xl"><AnimatedCount value={value} /></p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ SEARCH BAR ═══════ */}
      <div className="card-glass p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-cream">Date: <strong className="text-brand-300">{formatDate(selectedDate)}</strong></span>
          <span className="rounded-full bg-white/[.05] px-2 py-0.5 text-[11px] font-medium text-mist">({dateReports.length} entries)</span>
        </div>
        <div className="relative w-full sm:w-64">
          <Icon d={I.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search #, name, work type..."
            className="w-full rounded-xl border border-white/[.08] bg-ink-950 py-2.5 pl-9 pr-8 text-sm text-cream transition-colors placeholder:text-ink-500 focus:border-brand/50 focus:outline-none sm:py-2 sm:text-xs"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mist hover:text-cream">
              <Icon d={I.x} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════ REPORTS BY DATE ARCHIVE ═══════ */}
      <div className="card-premium p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-white/[.06] pb-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand-300">Archive</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-cream">Reports by Date</h2>
            <p className="mt-1 text-xs text-mist">Click any tile to view that day's logs. Download PDF directly for any date.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/[.1] bg-white/[.04] px-3 py-1.5 text-[11px] font-bold text-cream shadow-sm sm:self-auto">
            {reportsByDate.length} {reportsByDate.length === 1 ? "day" : "days"}
          </span>
        </div>

        {reportsByDate.length === 0 ? (
          <p className="py-8 text-center text-sm text-mist">No reports submitted yet. Use the forms above to add your first log.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {reportsByDate.slice(0, 10).map(({ date, reports: dayReports, total, broken, made }) => {
              const isSelected = date === selectedDate;
              return (
                <div
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200 active:scale-[.98] ${
                    isSelected
                      ? "border-brand/40 bg-gradient-to-br from-brand/[.1] to-brand/[.03] shadow-[0_2px_14px_rgba(227,27,35,.18)]"
                      : "border-white/[.08] bg-white/[.03] hover:border-brand/30 hover:bg-white/[.05] hover:shadow-[0_4px_14px_rgba(227,27,35,.1)]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-brand to-transparent" />
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-mist/70">
                    {formatDate(date)}
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-cream">
                    {total}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold">
                    {broken > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-brand/10 px-1.5 py-0.5 text-brand">
                        <span className="h-1 w-1 rounded-full bg-brand" />{broken}
                      </span>
                    )}
                    {made > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald/10 px-1.5 py-0.5 text-emerald">
                        <span className="h-1 w-1 rounded-full bg-emerald" />{made}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDFForDate(date);
                      }}
                      disabled={generatingPdf}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[.12] bg-white/[.06] px-2 py-1 text-[10px] font-bold text-mist transition-all duration-150 hover:border-brand/40 hover:bg-brand/[.08] hover:text-brand-300 active:scale-95 disabled:opacity-50"
                    >
                      <Icon d={I.inbox} className="h-3 w-3" />
                      PDF
                    </button>
                    {isSelected && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-brand">Viewing</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ DAILY LOGS TABLE ═══════ */}
      {filteredReports.length === 0 ? (
        <div className="card-premium p-16 text-center space-y-3">
          <span className="text-5xl">📋</span>
          <p className="text-mist text-sm">No entries for {formatDate(selectedDate)}.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => setActiveModal("broken")} className="text-xs font-semibold text-brand-300 hover:underline">
              + Record Broken Dhol
            </button>
            <span className="text-ink-500">•</span>
            <button onClick={() => setActiveModal("made")} className="text-xs font-semibold text-emerald hover:underline">
              + Record Made Dhol
            </button>
          </div>
        </div>
      ) : (
        <div className="card-premium p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base sm:text-lg font-semibold text-cream">📋 Daily Logs — {formatDate(selectedDate)}</h3>
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 rounded-lg border border-white/[.1] bg-white/[.04] text-xs font-semibold text-cream hover:bg-white/[.08]"
            >
              Export PDF
            </button>
          </div>

          {/* Mobile: card list (visible on small screens) */}
          <div className="space-y-2.5 sm:hidden">
            {filteredReports.map((r, idx) => (
              <div
                key={r.id}
                className={`rounded-xl border border-white/[.08] bg-white/[.03] p-3 space-y-2 ${r.brokenBy?.trim() ? "border-l-[3px] border-l-brand" : r.madeBy?.trim() ? "border-l-[3px] border-l-emerald" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-cream">#{r.dholNumber || "—"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-mist">{r.dholSize ? r.dholSize + '"' : ""}</span>
                    <button onClick={() => handleDelete(r.id)} className="p-1 text-mist transition-colors hover:text-brand-300" aria-label="Delete log">
                      <Icon d={I.trash} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-semibold text-cream">{r.workType || r.brokenPart || "—"}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  {r.brokenBy?.trim() ? <span className="font-semibold text-brand-300">💥 {r.brokenBy}</span> : null}
                  {r.madeBy?.trim() ? <span className="font-semibold text-emerald">🔨 {r.madeBy}</span> : null}
                  <span className={`ml-auto inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                    r.repairStatus === "Ready" ? "bg-emerald/15 text-emerald border-emerald/30" :
                    r.repairStatus === "Pending" ? "bg-gold/15 text-gold-300 border-gold/30" :
                    "bg-white/[.04] text-mist border-white/[.08]"
                  }`}>
                    {r.repairStatus || "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table (hidden on small screens) */}
          <div className="hidden overflow-x-auto -mx-2 sm:block">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/[.08] text-mist font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Dhol #</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Type / Work</th>
                  <th className="py-3 px-3">किसने फोड़ा</th>
                  <th className="py-3 px-3">किसने बनाया</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, idx) => (
                  <tr key={r.id} className={`border-b border-white/[.04] hover:bg-white/[.02] transition-colors ${r.brokenBy?.trim() ? "bg-brand/[.03]" : r.madeBy?.trim() ? "bg-emerald/[.03]" : ""}`}>
                    <td className="py-3 px-3 text-mist">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-cream">#{r.dholNumber || "—"}</td>
                    <td className="py-3 px-3 text-cream">{r.dholSize ? r.dholSize + '"' : "—"}</td>
                    <td className="py-3 px-3 text-cream">{r.workType || r.brokenPart || "—"}</td>
                    <td className="py-3 px-3 font-semibold text-brand-300">{r.brokenBy || "—"}</td>
                    <td className="py-3 px-3 font-semibold text-emerald">{r.madeBy || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.repairStatus === "Ready" ? "bg-emerald/15 text-emerald border-emerald/30" :
                        r.repairStatus === "Pending" ? "bg-gold/15 text-gold-300 border-gold/30" :
                        "bg-white/[.04] text-mist border-white/[.08]"
                      }`}>
                        {r.repairStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => handleDelete(r.id)} className="text-mist hover:text-brand-300 transition-colors p-1">
                        <Icon d={I.trash} className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: BROKEN LOG ═══════ */}
      {activeModal === "broken" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div className="relative card-premium max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto scroll-thin rounded-b-none p-5 shadow-lift animate-rise sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">💥 ढोल किसने फोड़ा</h2>
              <button onClick={() => setActiveModal(null)} className="text-mist hover:text-cream"><Icon d={I.x} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBroken} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Dhol Number *</span>
                  <input type="number" value={brokenForm.dholNumber} onChange={(e) => setBrokenForm({ ...brokenForm, dholNumber: e.target.value })} placeholder="e.g. 12" className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50" required />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Size *</span>
                  <select value={brokenForm.dholSize} onChange={(e) => setBrokenForm({ ...brokenForm, dholSize: Number(e.target.value) })} className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50">
                    {SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Work / Broken Part *</span>
                <select value={brokenForm.workType} onChange={(e) => setBrokenForm({ ...brokenForm, workType: e.target.value })} className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50">
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">किसने फोड़ा (Name) *</span>
                <input type="text" value={brokenForm.brokenBy} onChange={(e) => setBrokenForm({ ...brokenForm, brokenBy: e.target.value })} placeholder="e.g. Rahul Modi" className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50" required />
              </label>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Notes</span>
                <input type="text" value={brokenForm.notes} onChange={(e) => setBrokenForm({ ...brokenForm, notes: e.target.value })} placeholder="Optional..." className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50" />
              </label>
              <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                {saving ? "Saving..." : "💥 Save Broken Log"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════ MODAL: MADE LOG ═══════ */}
      {activeModal === "made" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div className="relative card-premium max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto scroll-thin rounded-b-none p-5 shadow-lift animate-rise sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">🔨 ढोल किसने बनाया</h2>
              <button onClick={() => setActiveModal(null)} className="text-mist hover:text-cream"><Icon d={I.x} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveMade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Dhol Number *</span>
                  <input type="number" value={madeForm.dholNumber} onChange={(e) => setMadeForm({ ...madeForm, dholNumber: e.target.value })} placeholder="e.g. 15" className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50" required />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Size *</span>
                  <select value={madeForm.dholSize} onChange={(e) => setMadeForm({ ...madeForm, dholSize: Number(e.target.value) })} className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50">
                    {SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Work Done *</span>
                <select value={madeForm.workType} onChange={(e) => setMadeForm({ ...madeForm, workType: e.target.value })} className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50">
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">किसने बनाया (Name) *</span>
                <input type="text" value={madeForm.madeBy} onChange={(e) => setMadeForm({ ...madeForm, madeBy: e.target.value })} placeholder="e.g. Sanket Dada" className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50" required />
              </label>
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Repair Status</span>
                <select value={madeForm.repairStatus} onChange={(e) => setMadeForm({ ...madeForm, repairStatus: e.target.value })} className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50">
                  <option value="Ready">Ready (बन गया)</option>
                  <option value="In Progress">In Progress (चल रहा)</option>
                  <option value="Pending">Pending (बाकी है)</option>
                </select>
              </label>

              {/* Consumption Preview */}
              {(() => {
                const c = getConsumption(madeForm.workType);
                const hasAny = c.dhoom > 0 || c.thapi > 0 || c.dori > 0;
                if (!hasAny) return null;
                return (
                  <div className="rounded-xl border border-gold/20 bg-gold/[.06] p-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-gold-300 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                      Auto-Deduct on Submit:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.dhoom > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-sky/25 bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">Dhoom -{c.dhoom} ({madeForm.dholSize}")</span>}
                      {c.thapi > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-300">Thapi -{c.thapi} ({madeForm.dholSize}")</span>}
                      {c.dori > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald/25 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">Dori -{c.dori} ({madeForm.dholSize}")</span>}
                    </div>
                  </div>
                );
              })()}

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Notes</span>
                <input type="text" value={madeForm.notes} onChange={(e) => setMadeForm({ ...madeForm, notes: e.target.value })} placeholder="Optional..." className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50" />
              </label>
              <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald to-emerald/80 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                {saving ? "Saving..." : "🔨 Save Made Log"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════ INVENTORY UPDATE MODALS ═══════ */}
      {activeModal === "dori" && (
        <InventoryModal title="Dori (Rope) Inventory" icon="🧵" currentData={doriData} onSave={handleSaveDori} onClose={() => setActiveModal(null)} single />
      )}
      {activeModal === "main" && (
        <InventoryModal title="Main (Nail) Inventory" icon="🔩" currentData={mainData} onSave={handleSaveMain} onClose={() => setActiveModal(null)} single />
      )}
      {activeModal === "pan" && (
        <InventoryModal title="Pan Inventory" icon="🎯" currentData={panData} onSave={handleSavePan} onClose={() => setActiveModal(null)} />
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-rise">
          <div className="flex items-center gap-2 rounded-xl border border-emerald/30 bg-ink-900/95 backdrop-blur-xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,.5)] text-sm font-semibold text-emerald">
            {toast}
          </div>
        </div>
      )}

    </div>
  );
}
