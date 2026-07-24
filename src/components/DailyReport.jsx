import { useEffect, useMemo, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Icon, I } from "./icons";
import { supabase } from "../lib/supabase";
import { sendWhatsApp } from "../utils/whatsapp";

const STORAGE_KEY = "taal-daily-dhol-report-v2";
const todayISO = () => new Date().toISOString().slice(0, 10);

const SIZES = [30, 28, 26];
const SIZE_LABELS = { 30: '30"', 28: '28"', 26: '26"' };

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

/* ─── Consumption Map: What each work type uses ─── */
const CONSUMPTION_MAP = {
  "Dhoom Change":        { dhoom: 1, thapi: 0, dori: 0 },
  "Thapi Change":        { dhoom: 0, thapi: 1, dori: 0 },
  "Dori Change":         { dhoom: 0, thapi: 0, dori: 1 },
  "Dhoom & Dori Change": { dhoom: 1, thapi: 0, dori: 1 },
  "Thapi & Dori Change": { dhoom: 0, thapi: 1, dori: 1 },
  "Dhoom & Thapi Change":{ dhoom: 1, thapi: 1, dori: 0 },
  "Pura Dhol Banaya":    { dhoom: 1, thapi: 1, dori: 1 },
  "General Maintenance": { dhoom: 0, thapi: 0, dori: 0 },
};

function getConsumption(workType) {
  return CONSUMPTION_MAP[workType] || { dhoom: 0, thapi: 0, dori: 0 };
}

/* Map form size (26/28/30) to DB size format */
function sizeToDbKey(size) {
  return `${size}\"`;
}

const emptyForm = {
  reportDate: todayISO(),
  dholNumber: "",
  dholSize: 28,
  workType: "Dhoom Change",
  brokenPart: "Dhoom Change",
  brokenBy: "",
  madeBy: "",
  presentCount: "15",
  remainingDhols: "5",
  remainingPan: "20",
  remainingDori: "12",
  repairStatus: "Pending",
  doriStatus: "Available",
  newDoriAdded: "No",
  doriAddedBy: "",
  panMainStatus: "Available",
  toolboxStatus: "OK",
  yesterdayBreaker: "",
  repairedBySamePerson: "Pending",
  readyCount: "1",
  notes: "",
  reportType: "Dhol Fodne",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status) {
  if (!status || status === "—" || status === "No" || status === "Dori No") {
    return "bg-white/[.04] text-mist border-white/[.08]";
  }
  if (status === "Available" || status === "OK" || status === "Yes" || status === "Ready" || status === "Dori Added") {
    return "bg-emerald/15 text-emerald border-emerald/30";
  }
  if (status === "Low" || status === "Need Check" || status === "Pending" || status === "In Repair" || status === "In Progress") {
    return "bg-gold/15 text-gold border-gold/30";
  }
  return "bg-brand/15 text-brand-300 border-brand/30";
}

/* ─── High-Definition White PDF Generator ───────────── */
async function downloadDailyReportPDF(records, reportDate) {
  const dateStr = formatDate(reportDate || new Date());
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const brokenLogs = records.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne");
  const madeLogs = records.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane");
  const latestReady = records.reduce((max, r) => Math.max(max, Number(r.readyCount) || 0), 0);

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:0;top:99999px;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;visibility:visible;display:block;";

  container.innerHTML = `
    <div>
      <!-- Logo Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <img src="/taal-pathak-logo-red.png" style="height:75px;width:auto;margin:0 auto 12px;display:block;" />
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;">TAAL Pathak — Daily Dhol Report</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-weight:500;">दैनिक ढोल अहवाल — ${dateStr} (${timeStr})</p>
      </div>

      <!-- 3 Stat Cards Row -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Total Daily Logs</div>
          <div style="font-size:32px;font-weight:700;color:#111827;margin-top:6px;">${records.length}</div>
        </div>
        <div style="background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:11px;color:#047857;font-weight:600;text-transform:uppercase;">Dhols Made / Repaired</div>
          <div style="font-size:32px;font-weight:700;color:#047857;margin-top:6px;">${madeLogs.length}</div>
        </div>
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:11px;color:#DC2626;font-weight:600;text-transform:uppercase;">Dhols Broken (किसने फोड़ा)</div>
          <div style="font-size:32px;font-weight:700;color:#DC2626;margin-top:6px;">${brokenLogs.length}</div>
        </div>
      </div>

      <!-- Clean White Grid Table -->
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E5E7EB;">
        <thead>
          <tr style="background:#111827;color:#FFF;">
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;width:35px;">#</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Dhol #</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Size</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">Type / Work</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">किसने फोड़ा (Broken By)</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:700;border:1px solid #111827;">किसने बनाया (Made By)</th>
            <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;border:1px solid #111827;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => `
            <tr style="background:#FFF;border-bottom:1px solid #E5E7EB;">
              <td style="padding:11px 10px;text-align:center;color:#6B7280;font-weight:600;border:1px solid #E5E7EB;">${i + 1}</td>
              <td style="padding:11px 10px;text-align:center;color:#111827;font-weight:700;font-family:monospace;border:1px solid #E5E7EB;">#${r.dholNumber || "—"}</td>
              <td style="padding:11px 10px;text-align:center;color:#374151;font-weight:600;border:1px solid #E5E7EB;">${r.dholSize ? r.dholSize + '"' : "—"}</td>
              <td style="padding:11px 12px;text-align:left;color:#374151;border:1px solid #E5E7EB;">${r.workType || r.brokenPart || "—"}</td>
              <td style="padding:11px 12px;text-align:left;color:#DC2626;font-weight:600;border:1px solid #E5E7EB;">${r.brokenBy || "—"}</td>
              <td style="padding:11px 12px;text-align:left;color:#047857;font-weight:600;border:1px solid #E5E7EB;">${r.madeBy || "—"}</td>
              <td style="padding:11px 10px;text-align:center;color:#111827;font-weight:600;border:1px solid #E5E7EB;">${r.repairStatus || "Pending"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Footer Signature -->
      <div style="margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;">
        <div>TAAL PATHAK Operations CRM — Daily Operational Report</div>
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
    while (left > 0) {
      pos = left - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
      left -= pageH;
    }

    pdf.save(`TAAL_Daily_Report_${dateStr.replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("PDF error:", err);
  } finally {
    document.body.removeChild(container);
  }
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — DailyReport
   ═══════════════════════════════════════════════════ */
export default function DailyReport() {
  const [reports, setReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [query, setQuery] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'broken', 'made'

  // Forms
  const [brokenForm, setBrokenForm] = useState({ ...emptyForm, reportDate: selectedDate, reportType: "Dhol Fodne" });
  const [madeForm, setMadeForm] = useState({ ...emptyForm, reportDate: selectedDate, workType: "Pura Dhol Banaya", reportType: "Dhol Banane" });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.getItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // Fetch from Supabase
  const loadSupabaseData = useCallback(async () => {
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
          toolboxStatus: d.toolbox_status,
          newDoriAdded: d.new_dori_added,
          doriAddedBy: d.dori_added_by,
          yesterdayBreaker: d.yesterday_breaker,
          readyCount: d.ready_count,
          notes: d.notes,
          reportType: d.report_type,
          createdAt: d.created_at,
        }));
        setReports(mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch { /* fallback to local */ }
  }, []);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // Selected date reports
  const dateReports = useMemo(() => {
    return reports.filter(r => r.reportDate === selectedDate);
  }, [reports, selectedDate]);

  // Filtered reports for search
  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dateReports;
    return dateReports.filter(r =>
      [r.reportDate, r.dholNumber, r.dholSize, r.workType, r.brokenBy, r.madeBy, r.notes].join(" ").toLowerCase().includes(q)
    );
  }, [dateReports, query]);

  // Daily Metrics & Counts
  const stats = useMemo(() => {
    const brokenCount = dateReports.filter(r => r.brokenBy?.trim() || r.reportType === "Dhol Fodne").length;
    const madeCount = dateReports.filter(r => r.madeBy?.trim() || r.reportType === "Dhol Banane").length;
    const readyCount = dateReports.reduce((max, r) => Math.max(max, Number(r.readyCount) || 0), 0);
    const presentCount = dateReports.length > 0 ? (Number(dateReports[0].presentCount) || 15) : 15;
    const remainingDhols = dateReports.length > 0 ? (Number(dateReports[0].remainingDhols) || 5) : 5;
    const remainingPan = dateReports.length > 0 ? (Number(dateReports[0].remainingPan) || 20) : 20;

    return { brokenCount, madeCount, readyCount, presentCount, remainingDhols, remainingPan };
  }, [dateReports]);

  /* ─── Submit Handlers ─── */
  const handleSaveBroken = async (e) => {
    e.preventDefault();
    if (!brokenForm.dholNumber || !brokenForm.brokenBy) return;
    setSaving(true);

    const newRecord = {
      ...brokenForm,
      id: crypto.randomUUID(),
      reportDate: selectedDate,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...reports];
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await supabase.from("daily_reports").insert({
        report_date: selectedDate,
        dhol_number: brokenForm.dholNumber,
        dhol_size: String(brokenForm.dholSize),
        work_type: brokenForm.workType,
        broken_part: brokenForm.workType,
        broken_by: brokenForm.brokenBy.trim(),
        made_by: "",
        repair_status: brokenForm.repairStatus,
        dori_status: brokenForm.doriStatus,
        pan_main_status: brokenForm.panMainStatus,
        toolbox_status: brokenForm.toolboxStatus,
        new_dori_added: brokenForm.newDoriAdded,
        dori_added_by: brokenForm.doriAddedBy,
        yesterday_breaker: brokenForm.yesterdayBreaker,
        ready_count: Number(brokenForm.readyCount) || 0,
        notes: brokenForm.notes,
        report_type: "Dhol Fodne",
      });
    } catch { /* ignore */ }

    setSaving(false);
    setActiveModal(null);
    setBrokenForm({ ...emptyForm, reportDate: selectedDate, reportType: "Dhol Fodne" });

    /* ─── AUTO WHATSAPP TRIGGER: Broken report alert ─── */
    try {
      const adminPhone = localStorage.getItem('wa_admin_phone');
      if (adminPhone) {
        const alertMsg = `📊 *TAAL Daily Report*\n\n🚨 Dhol Fodne Log:\n🥁 Dhol #${brokenForm.dholNumber} (${brokenForm.dholSize}")\n🔨 Kaam: ${brokenForm.workType}\n👤 Fodla: ${brokenForm.brokenBy}\n📅 Date: ${selectedDate}\n\nStatus: ${brokenForm.repairStatus}`;
        sendWhatsApp(adminPhone, alertMsg).catch(() => {});
      }
    } catch { /* ignore */ }
  };

  const handleSaveMade = async (e) => {
    e.preventDefault();
    if (!madeForm.dholNumber || !madeForm.madeBy) return;
    setSaving(true);

    const newRecord = {
      ...madeForm,
      id: crypto.randomUUID(),
      reportDate: selectedDate,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...reports];
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

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
        dori_status: madeForm.doriStatus,
        pan_main_status: madeForm.panMainStatus,
        toolbox_status: madeForm.toolboxStatus,
        new_dori_added: madeForm.newDoriAdded,
        dori_added_by: madeForm.doriAddedBy,
        ready_count: Number(madeForm.readyCount) || 0,
        notes: madeForm.notes,
        report_type: "Dhol Banane",
      });
    } catch { /* ignore */ }

    /* ─── AUTO-DEDUCT: Dhol Pan + Dori ─── */
    const consumption = getConsumption(madeForm.workType);
    const deducted = [];

    // Deduct from dhol_pan (old pane stock) based on dhol size
    if (consumption.dhoom > 0 || consumption.thapi > 0) {
      try {
        // Find the matching row in dhol_pan for old pane of this size
        const sizeKey = sizeToDbKey(madeForm.dholSize);
        const possibleSizes = [
          sizeKey,
          `\u0966${sizeKey}`, // Devanagari digits
          `${madeForm.dholSize}"`,
          `${madeForm.dholSize}\"`,
          `\u0968${madeForm.dholSize === 28 ? '\u096E' : madeForm.dholSize === 26 ? '\u0966' : '\u0966'}\"`,
        ];

        // First get current counts
        const { data: panRows } = await supabase
          .from("dhol_pan")
          .select("*")
          .eq("pane_type", "old");

        if (panRows && panRows.length > 0) {
          // Find the row that matches our size
          const matchRow = panRows.find(r => {
            const normalized = String(r.size || "")
              .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
              .replace(/[\u201C\u201D]/g, '"')
              .trim();
            return normalized.includes(String(madeForm.dholSize));
          });

          if (matchRow) {
            const newDhoom = Math.max(0, (Number(matchRow.dhoom) || 0) - consumption.dhoom);
            const newThapi = Math.max(0, (Number(matchRow.thapi) || 0) - consumption.thapi);

            await supabase
              .from("dhol_pan")
              .update({
                dhoom: newDhoom,
                thapi: newThapi,
                arrived_at: new Date().toISOString(),
              })
              .eq("id", matchRow.id);

            if (consumption.dhoom > 0) deducted.push(`Dhoom -${consumption.dhoom} (${madeForm.dholSize}"`);
            if (consumption.thapi > 0) deducted.push(`Thapi -${consumption.thapi} (${madeForm.dholSize}"`);
          }
        }
      } catch (err) {
        console.warn("Dhol Pan auto-deduct failed:", err);
      }
    }

    // Deduct from dori_inventory
    if (consumption.dori > 0) {
      try {
        const { data: doriRows } = await supabase
          .from("dori_inventory")
          .select("*")
          .limit(1);

        if (doriRows && doriRows.length > 0) {
          const currentCount = Number(doriRows[0].current_count) || 0;
          const newCount = Math.max(0, currentCount - consumption.dori);

          await supabase
            .from("dori_inventory")
            .update({
              current_count: newCount,
              last_updated_at: new Date().toISOString(),
              last_updated_by: madeForm.madeBy.trim(),
            })
            .eq("id", doriRows[0].id);

          deducted.push(`Dori -${consumption.dori}`);
        }
      } catch (err) {
        console.warn("Dori auto-deduct failed:", err);
      }
    }

    // Show toast notification
    if (deducted.length > 0) {
      setToast(`✅ Saved! Inventory updated: ${deducted.join(", ")}`);
      setTimeout(() => setToast(null), 4500);
    } else {
      setToast("✅ Made log saved!");
      setTimeout(() => setToast(null), 3000);
    }

    setSaving(false);
    setActiveModal(null);
    setMadeForm({ ...emptyForm, reportDate: selectedDate, workType: "Pura Dhol Banaya", reportType: "Dhol Banane" });

    /* ─── AUTO WHATSAPP TRIGGER: Made report notification ─── */
    try {
      const adminPhone = localStorage.getItem('wa_admin_phone');
      if (adminPhone) {
        const alertMsg = `📊 *TAAL Daily Report*\n\n✅ Dhol Banane Log:\n🥁 Dhol #${madeForm.dholNumber} (${madeForm.dholSize}")\n🔧 Kaam: ${madeForm.workType}\n👤 Banaya: ${madeForm.madeBy}\n📅 Date: ${selectedDate}\n\n${deducted.length > 0 ? `Inventory: ${deducted.join(', ')}` : ''}`;
        sendWhatsApp(adminPhone, alertMsg).catch(() => {});
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    try {
      await supabase.from("daily_reports").delete().eq("id", id);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 animate-rise">

      {/* ═══════ HERO HEADER ═══════ */}
      <section className="dashboard-hero overflow-hidden rounded-2xl border border-white/[.08] bg-ink-900/90 shadow-premium-xl">
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-brand-300">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                Live Daily Operations Control
              </span>
              <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3.5 py-1 text-xs text-mist">
                Date-wise Log & PDF Downloads
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream">
              दैनिक ढोल अहवाल — Daily Operations Report
            </h1>
            <p className="mt-2 text-sm text-mist max-w-xl">
              Track daily broken dhols, repairs, inventory (pan/dori/main), present members, and download date-wise PDF reports.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-ink-950 border border-white/[.1] px-3 py-2 rounded-xl">
              <span className="text-xs font-semibold text-mist uppercase">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-cream focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => setActiveModal("broken")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/10 text-brand-300 text-sm font-semibold hover:bg-brand/20 transition-all"
            >
              💥 किसने फोड़ा (Broken Log)
            </button>

            <button
              onClick={() => setActiveModal("made")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald/30 bg-emerald/10 text-emerald text-sm font-semibold hover:bg-emerald/20 transition-all"
            >
              🔨 किसने बनाया (Made Log)
            </button>

            <button
              onClick={() => downloadDailyReportPDF(dateReports, selectedDate)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_24px_rgba(220,38,38,.35)] transition-all hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Download PDF Report
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ STAT CARDS OVERVIEW ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">आज कितने ढोल बाकी हैं?</p>
          <p className="font-display text-2xl font-bold text-gold-300 mt-1">{stats.remainingDhols} Dhols</p>
        </div>

        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">आज Present लोग</p>
          <p className="font-display text-2xl font-bold text-emerald mt-1">{stats.presentCount} Members</p>
        </div>

        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">ढोल के पान बचे हैं</p>
          <p className="font-display text-2xl font-bold text-sky mt-1">{stats.remainingPan} Pan</p>
        </div>

        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">ढोल किसने फोड़ा</p>
          <p className="font-display text-2xl font-bold text-brand-300 mt-1">{stats.brokenCount} Logs</p>
        </div>

        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">ढोल किसने बनाया</p>
          <p className="font-display text-2xl font-bold text-emerald mt-1">{stats.madeCount} Logs</p>
        </div>

        <div className="card-premium p-4 text-center">
          <p className="text-[10px] text-mist uppercase tracking-wider">आज Ready Dhols</p>
          <p className="font-display text-2xl font-bold text-cream mt-1">{stats.readyCount} Ready</p>
        </div>
      </div>

      {/* ═══════ SEARCH & FILTER BAR ═══════ */}
      <div className="card-glass p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-cream">Date Selected: <strong className="text-brand-300">{formatDate(selectedDate)}</strong></span>
          <span className="text-xs text-mist font-medium">({dateReports.length} entries for this date)</span>
        </div>

        <div className="relative w-full sm:w-64">
          <Icon d={I.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search #, maker, or work type..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-ink-950 border border-white/[.08] text-xs text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-cream">
              <Icon d={I.x} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════ DAILY LOGS TABLE ═══════ */}
      {filteredReports.length === 0 ? (
        <div className="card-premium p-16 text-center space-y-3">
          <Icon d={I.note} className="w-10 h-10 text-mist/40 mx-auto" />
          <p className="text-mist text-sm">No operational records for {formatDate(selectedDate)}.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => setActiveModal("broken")} className="text-xs font-semibold text-brand-300 hover:underline">
              + Record Broken Dhol Log
            </button>
            <span className="text-ink-500">•</span>
            <button onClick={() => setActiveModal("made")} className="text-xs font-semibold text-emerald hover:underline">
              + Record Made Dhol Log
            </button>
          </div>
        </div>
      ) : (
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-cream">Daily Entries ({formatDate(selectedDate)})</h3>
            <button
              onClick={() => downloadDailyReportPDF(dateReports, selectedDate)}
              className="px-3.5 py-1.5 rounded-lg border border-white/[.1] bg-white/[.04] text-xs font-semibold text-cream hover:bg-white/[.08]"
            >
              Export PDF ({formatDate(selectedDate)})
            </button>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/[.08] text-mist font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Dhol #</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Type / Work</th>
                  <th className="py-3 px-3">किसने फोड़ा (Broken By)</th>
                  <th className="py-3 px-3">किसने बनाया (Made By)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, idx) => (
                  <tr key={r.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                    <td className="py-3 px-3 text-mist">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-cream">#{r.dholNumber || "—"}</td>
                    <td className="py-3 px-3 text-cream">{r.dholSize ? r.dholSize + '"' : "—"}</td>
                    <td className="py-3 px-3 text-cream">{r.workType || r.brokenPart || "—"}</td>
                    <td className="py-3 px-3 font-semibold text-brand-300">{r.brokenBy || "—"}</td>
                    <td className="py-3 px-3 font-semibold text-emerald">{r.madeBy || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle(r.repairStatus)}`}>
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

      {/* ═══════ MODAL 1: BROKEN DHOL LOG (किसने फोड़ा) ═══════ */}
      {activeModal === "broken" && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative card-premium p-6 w-full max-w-md space-y-4 animate-rise shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">💥 ढोल किसने फोड़ा (Broken Log)</h2>
              <button onClick={() => setActiveModal(null)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBroken} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Dhol Number *</span>
                  <input
                    type="number"
                    value={brokenForm.dholNumber}
                    onChange={(e) => setBrokenForm({ ...brokenForm, dholNumber: e.target.value })}
                    placeholder="e.g. 12"
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Size *</span>
                  <select
                    value={brokenForm.dholSize}
                    onChange={(e) => setBrokenForm({ ...brokenForm, dholSize: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  >
                    {SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Work / Broken Part *</span>
                <select
                  value={brokenForm.workType}
                  onChange={(e) => setBrokenForm({ ...brokenForm, workType: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                >
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">किसने फोड़ा (Broken By Name) *</span>
                <input
                  type="text"
                  value={brokenForm.brokenBy}
                  onChange={(e) => setBrokenForm({ ...brokenForm, brokenBy: e.target.value })}
                  placeholder="e.g. Rahul Modi"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Notes</span>
                <input
                  type="text"
                  value={brokenForm.notes}
                  onChange={(e) => setBrokenForm({ ...brokenForm, notes: e.target.value })}
                  placeholder="Optional details..."
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all"
              >
                {saving ? "Saving..." : "Save Broken Log"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL 2: MADE DHOL LOG (किसने बनाया) ═══════ */}
      {activeModal === "made" && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative card-premium p-6 w-full max-w-md space-y-4 animate-rise shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">🔨 ढोल किसने बनाया (Made / Repaired Log)</h2>
              <button onClick={() => setActiveModal(null)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Dhol Number *</span>
                  <input
                    type="number"
                    value={madeForm.dholNumber}
                    onChange={(e) => setMadeForm({ ...madeForm, dholNumber: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm font-mono text-cream focus:outline-none focus:border-brand/50"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Size *</span>
                  <select
                    value={madeForm.dholSize}
                    onChange={(e) => setMadeForm({ ...madeForm, dholSize: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  >
                    {SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Work Done *</span>
                <select
                  value={madeForm.workType}
                  onChange={(e) => setMadeForm({ ...madeForm, workType: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                >
                  {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">किसने बनाया (Made By Name) *</span>
                <input
                  type="text"
                  value={madeForm.madeBy}
                  onChange={(e) => setMadeForm({ ...madeForm, madeBy: e.target.value })}
                  placeholder="e.g. Sanket Dada"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Repair Status</span>
                <select
                  value={madeForm.repairStatus}
                  onChange={(e) => setMadeForm({ ...madeForm, repairStatus: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                >
                  <option value="Ready">Ready (बन गया)</option>
                  <option value="In Progress">In Progress (चल रहा है)</option>
                  <option value="Pending">Pending (बाकी है)</option>
                </select>
              </label>

              {/* ─── Consumption Preview ─── */}
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
                      {c.dhoom > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky/25 bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">
                          Dhoom -{c.dhoom} ({madeForm.dholSize}")
                        </span>
                      )}
                      {c.thapi > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-300">
                          Thapi -{c.thapi} ({madeForm.dholSize}")
                        </span>
                      )}
                      {c.dori > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald/25 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">
                          Dori -{c.dori}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-mist mt-1">Dhol Pan aur Dori count automatically update hoga!</p>
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald to-emerald/80 text-white text-sm font-semibold hover:shadow-lg transition-all"
              >
                {saving ? "Saving..." : "Save Made Log"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ TOAST NOTIFICATION ═══════ */}
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
