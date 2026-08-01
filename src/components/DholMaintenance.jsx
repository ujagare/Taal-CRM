import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
// jsPDF & jspdf-autotable are dynamically imported inside handleDownload
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

/* ─────────────────────────────────────────────
   CONSTANTS & CONFIG
───────────────────────────────────────────── */
const TOTAL_DHOLS = 54;
const HISTORY_DAYS = 60;

// Size Rule: #1-#10 = 30", #11-#52 = 28", #53-#54 = 26"
export function getDholSize(num) {
  const n = Number(num);
  if (n >= 1 && n <= 10) return 30;
  if (n >= 53) return 26;
  return 28;
}

/* ── PDF List Data (27-07-2026) ── */
const JULY_27_2026_LOGS = [
  { dhol_number: 5,  dhol_size: "30", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Ashish", done_by_2: null, notes: null },
  { dhol_number: 6,  dhol_size: "30", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Suyash Gadgil", done_by_2: null, notes: "Earlier surname corrected" },
  { dhol_number: 10, dhol_size: "30", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Akshay Choudhari", done_by_2: null, notes: null },
  { dhol_number: 11, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Maheshwar", done_by_2: "Sukhen", notes: "Two names" },
  { dhol_number: 12, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Saurabh Kanojia", done_by_2: null, notes: null },
  { dhol_number: 13, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Shubham G", done_by_2: "Pradish S", notes: "Two names" },
  { dhol_number: 14, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Siddhant Gore", done_by_2: "Ashish", notes: "Two names" },
  { dhol_number: 15, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Rohan Bramankar", done_by_2: "Tejas M", notes: "Handwritten note" },
  { dhol_number: 16, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Anand Pawar", done_by_2: "Vivet G", notes: "Two names" },
  { dhol_number: 17, dhol_size: "28", maintenance_date: "2026-07-27", description: "Dori Work", done_by: "Aryan", done_by_2: null, notes: "30 ki Dori" },
  { dhol_number: 18, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Girish Jhelane", done_by_2: null, notes: null },
  { dhol_number: 19, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Ajinkya U", done_by_2: null, notes: null },
  { dhol_number: 20, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Vikrant Chinchwade", done_by_2: null, notes: null },
  { dhol_number: 21, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Ajinkya Shewale", done_by_2: null, notes: null },
  { dhol_number: 22, dhol_size: "28", maintenance_date: "2026-07-27", description: "Dori Work", done_by: "Suyash Gaikwad", done_by_2: null, notes: "30 chi Dori" },
  { dhol_number: 23, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Nikhil Khaladkar", done_by_2: null, notes: null },
  { dhol_number: 24, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Shreya Kendale", done_by_2: "Krishna", notes: "Two names" },
  { dhol_number: 25, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Satil Khandale", done_by_2: "Atul", notes: "Two names" },
  { dhol_number: 26, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Soham Natekar", done_by_2: null, notes: "Star mark" },
  { dhol_number: 27, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Atharv Koli", done_by_2: "Vikrant C", notes: "Two names" },
  { dhol_number: 28, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Harsh S", done_by_2: null, notes: "Star mark" },
  { dhol_number: 29, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Rupesh", done_by_2: "Ajinkya J", notes: "Two names" },
  { dhol_number: 30, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Rahul Meher (W)", done_by_2: null, notes: null },
  { dhol_number: 31, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Akash Alkunte", done_by_2: null, notes: "Double star + note" },
  { dhol_number: 32, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Amey Atole", done_by_2: null, notes: null },
  { dhol_number: 33, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Purvesh Khade", done_by_2: null, notes: null },
  { dhol_number: 34, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Rohit Tamkar", done_by_2: null, notes: null },
  { dhol_number: 35, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Kunal Pawar", done_by_2: null, notes: null },
  { dhol_number: 36, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Girish", done_by_2: "Shubham G", notes: "Two names" },
  { dhol_number: 37, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Mandar G", done_by_2: "Anayd P", notes: "Two names" },
  { dhol_number: 38, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Amogh", done_by_2: "Shreyas", notes: "Two names" },
  { dhol_number: 39, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Koradi", done_by_2: "Saksham", notes: "Two names" },
  { dhol_number: 40, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Vaibhav Suvarnar", done_by_2: null, notes: null },
  { dhol_number: 41, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Bhushan Devkarle", done_by_2: null, notes: null },
  { dhol_number: 43, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Yash Kundale", done_by_2: null, notes: null },
  { dhol_number: 44, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Tejas Morzette", done_by_2: null, notes: null },
  { dhol_number: 45, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Chaitanya Raccha", done_by_2: null, notes: null },
  { dhol_number: 46, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Swapnil Kisan", done_by_2: null, notes: null },
  { dhol_number: 47, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Sunny", done_by_2: null, notes: null },
  { dhol_number: 48, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Shubham Gadekar", done_by_2: null, notes: null },
  { dhol_number: 50, dhol_size: "28", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Abhishek Shitole", done_by_2: "Anand Pawar", notes: "Two names" },
  { dhol_number: 53, dhol_size: "26", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Dnyanesh Gabaal", done_by_2: null, notes: null },
  { dhol_number: 54, dhol_size: "26", maintenance_date: "2026-07-27", description: "Normal Dhol", done_by: "Yash Dalvi", done_by_2: null, notes: null },
];

// Maintenance options requested by user
const MAINTENANCE_OPTIONS = [
  "Normal Dhol",
  "Dhoom Foda",
  "Thapi Foda",
  "Dhoom & Thapi Dono Foda",
  "Dhoom & Dori",
  "Thapi & Dori",
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function getStatusColor(logs) {
  if (!logs || logs.length === 0) return "none";
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasToday = logs.some((l) => l.maintenance_date === todayStr);
  if (hasToday) return "today";

  const days = daysAgo(logs[0]?.maintenance_date);
  if (days === null) return "none";
  if (days <= 7) return "recent";
  if (days <= 30) return "old";
  return "stale";
}

/* ─────────────────────────────────────────────
   PDF EXPORT MODAL & DEPENDENCY-FREE GENERATOR
───────────────────────────────────────────── */
function PdfExportModal({ logs, dhols, onClose }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [rangeType, setRangeType] = useState("today"); // today, week, month, custom
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [sizeFilter, setSizeFilter] = useState("all");
  const [dholNumFilter, setDholNumFilter] = useState("all");
  const [downloading, setDownloading] = useState(false);

  // Lock body scroll on modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Filter logs based on chosen options
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = log.maintenance_date;

      // Range check
      if (rangeType === "today") {
        if (logDate !== todayStr) return false;
      } else if (rangeType === "week") {
        const d = daysAgo(logDate);
        if (d === null || d > 7) return false;
      } else if (rangeType === "month") {
        const d = daysAgo(logDate);
        if (d === null || d > 30) return false;
      } else if (rangeType === "custom") {
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
      }

      // Size check
      if (sizeFilter !== "all") {
        const dNum = log.dhol_number || log.dhol_id;
        if (String(getDholSize(dNum)) !== sizeFilter) {
          return false;
        }
      }

      // Dhol Number check
      if (
        dholNumFilter !== "all" &&
        String(log.dhol_number) !== dholNumFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    logs,
    rangeType,
    startDate,
    endDate,
    sizeFilter,
    dholNumFilter,
    todayStr,
  ]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let rangeTitle = "Today";
      if (rangeType === "week") rangeTitle = "Last 7 Days";
      else if (rangeType === "month") rangeTitle = "Last 30 Days";
      else if (rangeType === "custom")
        rangeTitle = `${fmtDate(startDate)} to ${fmtDate(endDate)}`;

      const generated = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const totalLogs = filteredLogs.length;
      const uniqueDhols = new Set(
        filteredLogs.map((l) => l.dhol_number || l.dhol_id),
      ).size;
      const uniquePeople = new Set(
        filteredLogs.flatMap((l) =>
          [l.done_by, l.done_by_2].filter(Boolean),
        ),
      ).size;

      // ── Create Clean Printable HTML Container ──
      const container = document.createElement("div");
      container.style.cssText =
        "position:absolute;left:0;top:99999px;width:800px;background:#FFFFFF;color:#111827;font-family:Outfit,system-ui,-apple-system,sans-serif;padding:40px 32px;box-sizing:border-box;visibility:visible;display:block;";

      container.innerHTML = `
        <div>
          <!-- Header Banner -->
          <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:20px;">
            <img src="/taal-pathak-logo-red.png" style="height:65px;width:auto;margin:0 auto 10px;display:block;" alt="TAAL Logo" />
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">TAAL Pathak — Dhol Maintenance Report</h1>
            <p style="margin:6px 0 0;font-size:12px;color:#6B7280;font-weight:500;">
              Period: <strong>${rangeTitle}</strong> &nbsp;|&nbsp; 
              Size: <strong>${sizeFilter === "all" ? "All Sizes" : sizeFilter + '"'}</strong> &nbsp;|&nbsp; 
              Dhol: <strong>${dholNumFilter === "all" ? "All Dhols" : "#" + dholNumFilter}</strong> &nbsp;|&nbsp; 
              Generated: <strong>${generated}</strong>
            </p>
          </div>

          <!-- KPI Metric Cards -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:10px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Total Logs</div>
              <div style="font-size:28px;font-weight:800;color:#111827;margin-top:4px;">${totalLogs}</div>
            </div>
            <div style="background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:10px;color:#047857;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Dhols Maintained</div>
              <div style="font-size:28px;font-weight:800;color:#047857;margin-top:4px;">${uniqueDhols}</div>
            </div>
            <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:10px;color:#DC2626;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Members Involved</div>
              <div style="font-size:28px;font-weight:800;color:#DC2626;margin-top:4px;">${uniquePeople}</div>
            </div>
          </div>

          <!-- Data Table -->
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#111827;color:#FFFFFF;">
                <th style="padding:10px 8px;text-align:center;width:35px;font-weight:700;font-size:10.5px;text-transform:uppercase;">#</th>
                <th style="padding:10px 10px;text-align:left;width:80px;font-weight:700;font-size:10.5px;text-transform:uppercase;">Date</th>
                <th style="padding:10px 8px;text-align:center;width:65px;font-weight:700;font-size:10.5px;text-transform:uppercase;">Dhol #</th>
                <th style="padding:10px 8px;text-align:center;width:55px;font-weight:700;font-size:10.5px;text-transform:uppercase;">Size</th>
                <th style="padding:10px 10px;text-align:left;width:150px;font-weight:700;font-size:10.5px;text-transform:uppercase;">Maintenance Work</th>
                <th style="padding:10px 10px;text-align:left;width:160px;font-weight:700;font-size:10.5px;text-transform:uppercase;">Member Name(s)</th>
                <th style="padding:10px 10px;text-align:left;font-weight:700;font-size:10.5px;text-transform:uppercase;">Notes / Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredLogs.length === 0
                  ? `<tr><td colspan="7" style="padding:24px;text-align:center;color:#6B7280;font-size:12px;font-weight:500;">Koi maintenance record nahi mila is selected filter me.</td></tr>`
                  : filteredLogs
                      .map((log, i) => {
                        const bg = i % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
                        const dholNum = log.dhol_number || log.dhol_id;
                        const dholSz = getDholSize(dholNum);
                        const names = log.done_by_2
                          ? `${log.done_by} & ${log.done_by_2}`
                          : log.done_by || "—";
                        return `
                        <tr style="background:${bg};border-bottom:1px solid #E5E7EB;">
                          <td style="padding:9px 8px;text-align:center;color:#9CA3AF;font-size:10.5px;">${i + 1}</td>
                          <td style="padding:9px 10px;text-align:left;color:#374151;font-weight:600;">${log.maintenance_date ? fmtDate(log.maintenance_date) : "—"}</td>
                          <td style="padding:9px 8px;text-align:center;">
                            <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#F3F4F6;border:1px solid #D1D5DB;font-weight:800;color:#111827;font-family:monospace;font-size:11px;">#${dholNum}</span>
                          </td>
                          <td style="padding:9px 8px;text-align:center;color:#4B5563;font-weight:700;">${dholSz}"</td>
                          <td style="padding:9px 10px;text-align:left;">
                            <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;font-weight:700;font-size:10.5px;">${log.description || "Normal Dhol"}</span>
                          </td>
                          <td style="padding:9px 10px;text-align:left;font-weight:700;color:#111827;">${names}</td>
                          <td style="padding:9px 10px;text-align:left;color:#6B7280;font-style:italic;font-size:10.5px;">${log.notes || "—"}</td>
                        </tr>
                      `;
                      })
                      .join("")
              }
            </tbody>
          </table>

          <!-- Footer -->
          <div style="margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;font-weight:500;">
            <div>TAAL Pathak Operations CRM — Official Dhol Maintenance Report</div>
            <div>Generated on ${generated}</div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for image loading
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
            }),
        ),
      );

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgW = 210,
        pageH = 297;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");

      let left = imgH,
        pos = 0;
      pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
      left -= pageH;
      while (left > 0) {
        pos = left - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, pos, imgW, imgH);
        left -= pageH;
      }

      pdf.save(`Dhol-Maintenance-Report-${todayStr}.pdf`);
      document.body.removeChild(container);
      onClose();
    } catch (err) {
      console.error("PDF Download Error:", err);
      alert("PDF generate nahi ho paya: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/55 p-4 animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scroll-thin rounded-2xl border border-white/10 bg-ink-900 shadow-2xl animate-rise">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-gold to-emerald" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-300">
              📄 PDF Report Generator
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-cream mt-0.5">
              Download Maintenance PDF
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl border border-white/10 bg-white/[.05] text-mist hover:text-cream"
          >
            <Icon d={I.x} className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Preset Ranges */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-mist mb-2">
              📆 Report Period Select Karo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "today", label: "🌅 Aaj Ka", sub: "Today" },
                { id: "week", label: "📅 Is Hafte", sub: "7 Days" },
                { id: "month", label: "🗓️ Is Mahine", sub: "30 Days" },
                { id: "custom", label: "⚙️ Custom", sub: "Range" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRangeType(item.id)}
                  className={`rounded-xl px-2 py-2.5 text-center transition-all border ${
                    rangeType === item.id
                      ? "bg-brand text-white border-brand shadow-glow"
                      : "bg-white/[.04] text-mist border-white/10 hover:text-cream hover:bg-white/[.08]"
                  }`}
                >
                  <p className="text-[11px] font-bold">{item.label}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">{item.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Selection */}
          {rangeType === "custom" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[.03] border border-white/10">
              <div>
                <label className="block text-[11px] font-semibold text-mist mb-1">
                  📅 From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-ink-950 px-3 py-2 text-xs text-cream font-semibold focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-mist mb-1">
                  📅 To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-ink-950 px-3 py-2 text-xs text-cream font-semibold focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Optional Dhol Size & Number Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-mist mb-1">
                🎵 Size Filter
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-xs text-cream font-semibold focus:border-brand focus:outline-none"
              >
                <option value="all">Sab Sizes (All)</option>
                <option value="30">30&quot; Size (#1-#10)</option>
                <option value="28">28&quot; Size (#11-#52)</option>
                <option value="26">26&quot; Size (#53-#54)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-mist mb-1">
                🥁 Dhol Filter
              </label>
              <select
                value={dholNumFilter}
                onChange={(e) => setDholNumFilter(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-xs text-cream font-semibold focus:border-brand focus:outline-none"
              >
                <option value="all">Sab Dhol (1-54)</option>
                {dhols.map((d) => (
                  <option key={d.id} value={String(d.dhol_number)}>
                    Dhol #{d.dhol_number} ({d.size}&quot;)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PDF Preview Card */}
          <div className="rounded-2xl border border-white/[.12] overflow-hidden shadow-xl">
            {/* Mini PDF Cover Preview */}
            <div className="relative bg-[#0a0f1c] p-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-gold to-emerald" />
              <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-brand" />
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 shrink-0">
                  <span className="text-lg">🥁</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.15em] text-gold-300">
                    PDF Preview
                  </p>
                  <p className="text-xs font-bold text-cream leading-tight">
                    DHOL MAINTENANCE REPORT
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[9px] text-mist">A4 Format</p>
                  <p className="text-[9px] text-emerald font-semibold">Premium PDF</p>
                </div>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-brand/15 border border-brand/20 p-2 text-center">
                  <p className="text-lg font-extrabold text-brand-300 tabular-nums">
                    {filteredLogs.length}
                  </p>
                  <p className="text-[8px] font-bold text-mist uppercase mt-0.5">
                    Records
                  </p>
                </div>
                <div className="rounded-lg bg-gold/15 border border-gold/20 p-2 text-center">
                  <p className="text-lg font-extrabold text-gold-300 tabular-nums">
                    {
                      new Set(
                        filteredLogs.map((l) => l.dhol_number || l.dhol_id),
                      ).size
                    }
                  </p>
                  <p className="text-[8px] font-bold text-mist uppercase mt-0.5">
                    Dhols
                  </p>
                </div>
                <div className="rounded-lg bg-emerald/15 border border-emerald/20 p-2 text-center">
                  <p className="text-lg font-extrabold text-emerald tabular-nums">
                    {
                      new Set(
                        filteredLogs.flatMap((l) =>
                          [l.done_by, l.done_by_2].filter(Boolean),
                        ),
                      ).size
                    }
                  </p>
                  <p className="text-[8px] font-bold text-mist uppercase mt-0.5">
                    Members
                  </p>
                </div>
              </div>
              {/* PDF Structure preview */}
              <div className="mt-3 flex gap-2">
                <div className="flex-1 rounded-lg bg-white/[.03] border border-white/[.06] p-2">
                  <p className="text-[9px] font-bold text-cream mb-1">
                    Page Header
                  </p>
                  <div className="space-y-0.5">
                    <div className="h-1 w-full rounded bg-brand/40" />
                    <div className="h-1 w-3/4 rounded bg-white/20" />
                    <div className="h-1 w-1/2 rounded bg-gold/30" />
                    <div className="grid grid-cols-3 gap-0.5 mt-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-2 rounded bg-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-white/[.03] border border-white/[.06] p-2">
                  <p className="text-[9px] font-bold text-cream mb-1">
                    Data Table
                  </p>
                  <div className="space-y-0.5">
                    <div className="h-1 w-full rounded bg-brand/40" />
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 w-full rounded ${i % 2 === 0 ? "bg-white/10" : "bg-white/[.05]"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-white/[.02] border-t border-white/[.06] flex items-center gap-2">
              <span className="text-[10px] text-emerald font-semibold">
                ✅ Premium light-theme PDF • Clean HTML2Canvas Table layout
              </span>
              {filteredLogs.length === 0 && (
                <span className="ml-auto rounded-full bg-brand/20 border border-brand/30 px-2 py-0.5 text-[9px] font-bold text-brand-300">
                  ⚠️ No Data
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/[.08] bg-ink-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-mist hover:text-cream transition-colors"
          >
            ✕ Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-glow transition-all hover:bg-brand-300 disabled:opacity-40 active:scale-95"
          >
            <Icon d={I.download} className="h-4 w-4" />
            {downloading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                PDF Ban Raha Hai...
              </span>
            ) : (
              `📥 PDF Download Karo (${filteredLogs.length})`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────
   ADD MAINTENANCE MODAL (Compact Mobile Sheet via Portal)
───────────────────────────────────────────── */
function AddMaintenanceModal({ dhol, onSave, onClose }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [doneBy, setDoneBy] = useState("");
  const [doneBy2, setDoneBy2] = useState("");
  const [description, setDescription] = useState("Normal Dhol");
  const [notes, setNotes] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Lock body scroll on open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    if (!doneBy.trim()) {
      setError("Kisne kiya (1) naam likhna zaroori hai!");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      dhol_id: dhol.id,
      dhol_number: dhol.dhol_number,
      dhol_size: String(dhol.size),
      maintenance_date: maintenanceDate,
      description: description.trim() || "Normal Dhol",
      done_by: doneBy.trim(),
      done_by_2: doneBy2.trim() || null,
      notes: notes.trim() || null,
    };

    const { data: savedData, error: err } = await supabase
      .from("dhol_maintenance")
      .insert(payload)
      .select(); // confirm data was actually inserted

    setSaving(false);
    if (err) {
      console.error(
        "❌ Maintenance save error:",
        err.message,
        err.code,
        err.details,
      );
      setError(`Save nahi hua (${err.code || "error"}): ${err.message}`);
      return;
    }
    console.log("✅ Maintenance saved to Supabase:", savedData);
    onSave();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/65">
      <div className="min-h-screen px-4 py-6 flex items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl animate-rise flex flex-col my-auto">
          {/* Glowing top line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-gold to-emerald" />

          {/* Header (Compact) */}
          <div className="p-3.5 sm:p-4 border-b border-white/[.08] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/20 border border-brand/40 px-2 py-0.5 text-[11px] font-bold text-brand-300">
                  Dhol #{dhol.dhol_number}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-mist">
                  Size: {dhol.size}"
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg sm:text-xl font-bold text-cream">
                Maintenance Add Karo
              </h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[.05] text-mist hover:text-cream transition-colors"
            >
              <Icon d={I.x} className="h-4 w-4" />
            </button>
          </div>

          {/* Body Form (Compact) */}
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 text-xs">
            {/* Date Picker Section */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-mist mb-1">
                📅 Maintenance Date (Aaj Ki Date)
              </label>
              <input
                type="date"
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-cream font-semibold focus:border-brand focus:outline-none cursor-pointer"
              />
              {maintenanceDate === todayStr && (
                <p className="mt-1 text-[10px] text-emerald font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                  Aaj ki date selected hai ({fmtDate(todayStr)})
                </p>
              )}
            </div>

            {/* Description Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-mist mb-1">
                🔧 Maintenance Type / Description
              </label>
              <select
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2.5 text-cream font-semibold focus:border-brand focus:outline-none cursor-pointer"
              >
                {MAINTENANCE_OPTIONS.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    className="bg-ink-900 text-cream py-1"
                  >
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Kisne Kiya (1 & 2) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-mist mb-1">
                  👤 Kisne Kiya (1)*
                </label>
                <input
                  type="text"
                  value={doneBy}
                  onChange={(e) => setDoneBy(e.target.value)}
                  placeholder="Pehla naam"
                  className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-cream placeholder:text-mist/40 focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-mist mb-1">
                  👤 Kisne Kiya (2)
                </label>
                <input
                  type="text"
                  value={doneBy2}
                  onChange={(e) => setDoneBy2(e.target.value)}
                  placeholder="Doosra naam"
                  className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-cream placeholder:text-mist/40 focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-mist mb-1">
                📝 Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra note ya problem ki jankari..."
                rows={2}
                className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-cream placeholder:text-mist/40 focus:border-brand focus:outline-none resize-none"
              />
            </div>

            {error && (
              <p className="p-2.5 rounded-xl bg-brand/10 border border-brand/30 text-xs font-bold text-brand-300">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* Footer (Compact) */}
          <div className="p-3 sm:p-4 border-t border-white/[.08] bg-ink-950/60 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-mist hover:text-cream"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white shadow-glow transition-all hover:bg-brand-300 disabled:opacity-50"
            >
              <Icon d={I.check} className="h-4 w-4" />
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────
   DETAIL DRAWER — full 60-day history for one dhol
───────────────────────────────────────────── */
function DetailDrawer({ dhol, logs, onAdd, onClose }) {
  // Lock body scroll on drawer open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date),
      ),
    [logs],
  );

  const statusColor = getStatusColor(sorted);
  const statusBadge = {
    today: {
      label: "Aaj Kiya ✅",
      cls: "border-emerald/30 bg-emerald/10 text-emerald",
    },
    recent: {
      label: "Hafte Mein",
      cls: "border-gold/30 bg-gold/10 text-gold-300",
    },
    old: { label: "30 Din Mein", cls: "border-sky/30 bg-sky/10 text-sky" },
    stale: {
      label: "60d+ Purana",
      cls: "border-brand/30 bg-brand/10 text-brand-300",
    },
    none: {
      label: "Kabhi Nahi",
      cls: "border-white/10 bg-white/[.04] text-mist",
    },
  }[statusColor];

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex justify-end bg-slate-950/55">
      <div className="relative z-10 h-full w-full max-w-lg flex flex-col border-l border-white/[.1] bg-ink-950 shadow-[-24px_0_80px_rgba(0,0,0,.9)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand via-gold to-emerald" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[.08]">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-mist font-bold">
              60-Day Maintenance History
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="font-display text-3xl font-extrabold text-cream">
                #{dhol.dhol_number}
              </h2>
              <span className="rounded-full bg-brand/20 border border-brand/30 px-3 py-1 text-xs font-bold text-cream">
                Size: {dhol.size}"
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadge.cls}`}
              >
                {statusBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.05] text-mist hover:text-cream hover:bg-white/10 transition-colors"
          >
            <Icon d={I.x} className="h-5 w-5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4 border-b border-white/[.08]">
          <button
            onClick={onAdd}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-300 px-5 py-3 text-sm font-bold text-white shadow-[0_2px_10px_rgba(227,27,35,.28)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(227,27,35,.38)] hover:brightness-105 active:scale-[.98]"
          >
            <Icon d={I.plus} className="h-5 w-5" />
            Nayi Maintenance Entry Add Karo
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">🥁</div>
              <p className="text-cream text-lg font-bold">Koi Record Nahi</p>
              <p className="text-mist text-xs mt-1">
                Is Dhol ki abhi tak koi maintenance log nahi hui hai.
              </p>
            </div>
          ) : (
            sorted.map((log, idx) => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const isToday = log.maintenance_date === todayStr;
              return (
                <div
                  key={log.id || idx}
                  className={`relative rounded-2xl border p-4 transition-all ${
                    isToday
                      ? "border-emerald/40 bg-emerald/[.08] shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                      : idx === 0
                        ? "border-brand/30 bg-brand/[.06]"
                        : "border-white/[.08] bg-white/[.03]"
                  }`}
                >
                  {isToday && (
                    <span className="absolute top-3 right-3 rounded-full bg-emerald/20 border border-emerald/40 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald uppercase tracking-widest">
                      Aaj
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 border border-brand/30 font-bold text-brand-300 text-sm">
                      #{sorted.length - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-cream">
                        {log.description || "Normal Dhol"}
                      </p>
                      <p className="text-xs text-mist font-medium mt-0.5">
                        📅 {fmtDate(log.maintenance_date)}
                      </p>

                      {/* Who did it */}
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {log.done_by && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-semibold text-gold-300">
                            👤 {log.done_by}
                          </span>
                        )}
                        {log.done_by_2 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/15 border border-sky/30 px-3 py-1 text-xs font-semibold text-sky">
                            👤 {log.done_by_2}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <div className="mt-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-cream/90 italic">
                          📝 {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────
   PREMIUM FLIP CARD (Dhol Card with 3D Flip)
───────────────────────────────────────────── */
function DholCard({ dhol, logs, onAddClick, onHistoryClick }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const sorted = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date),
      ),
    [logs],
  );

  const statusColor = getStatusColor(sorted);
  const lastLog = sorted[0] || null;

  // Visual Theme Accents based on status
  const cardBorder = {
    today:
      "border-emerald/50 bg-ink-900 shadow-[0_0_24px_rgba(52,211,153,0.25)]",
    recent: "border-gold/40 bg-ink-900 shadow-[0_0_18px_rgba(245,158,11,0.2)]",
    old: "border-sky/35 bg-ink-900 shadow-[0_0_14px_rgba(14,165,233,0.15)]",
    stale: "border-brand/35 bg-ink-900 shadow-[0_0_12px_rgba(220,38,38,0.15)]",
    none: "border-white/10 bg-ink-900/90",
  }[statusColor];

  const statusBadge = {
    today: {
      text: "Aaj Active",
      cls: "bg-emerald/20 text-emerald border-emerald/40",
    },
    recent: {
      text: "Hafte Mein",
      cls: "bg-gold/20 text-gold-300 border-gold/40",
    },
    old: { text: "30d Purana", cls: "bg-sky/20 text-sky border-sky/40" },
    stale: {
      text: "Stale / 60d+",
      cls: "bg-brand/20 text-brand-300 border-brand/40",
    },
    none: { text: "No Log", cls: "bg-white/10 text-mist border-white/15" },
  }[statusColor];

  return (
    <div
      className="group relative h-48 sm:h-52 w-full cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped((prev) => !prev)}
    >
      <div
        className="relative h-full w-full rounded-2xl transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ════ FRONT FACE ════ */}
        <div
          className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border ${cardBorder} p-3.5 backdrop-blur-xl transition-all`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Top Row: Dhol Number & Size Pill */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream">
                #{dhol.dhol_number}
              </span>
            </div>
            <span className="rounded-full bg-brand/20 border border-brand/40 px-2.5 py-1 text-xs font-bold text-cream shadow-sm">
              {dhol.size}"
            </span>
          </div>

          {/* Middle Body: Status Indicator & Info */}
          <div className="my-auto space-y-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge.cls}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusColor === "today" ? "bg-emerald animate-pulse" : "bg-current"}`}
                />
                {statusBadge.text}
              </span>
            </div>

            {lastLog ? (
              <div className="text-xs text-cream/90 font-medium truncate mt-1">
                <p className="text-[11px] text-mist/70 truncate">
                  {lastLog.description || "Normal Dhol"}
                </p>
                <p className="text-gold-300 text-xs font-semibold truncate">
                  👤 {lastLog.done_by}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-mist/50 italic mt-1">
                Abhi tak koi log nahi
              </p>
            )}
          </div>

          {/* Bottom Footer: Date & Flip prompt */}
          <div className="flex items-center justify-between border-t border-white/[.08] pt-2 text-[10px] text-mist">
            <span>{lastLog ? fmtDate(lastLog.maintenance_date) : "—"}</span>
            <span className="font-semibold text-brand-300 group-hover:underline">
              Hover / Tap 🔄
            </span>
          </div>
        </div>

        {/* ════ BACK FACE (Flipped) ════ */}
        <div
          className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-brand/50 bg-ink-950 p-3.5 shadow-2xl backdrop-blur-2xl`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Header Back */}
          <div className="flex items-center justify-between border-b border-white/[.08] pb-1.5">
            <span className="font-display text-lg font-bold text-cream">
              Dhol #{dhol.dhol_number} ({dhol.size}")
            </span>
            <span className="text-[10px] text-gold-300 font-bold uppercase">
              Details
            </span>
          </div>

          {/* Last Maintenance Details */}
          <div className="flex-1 my-2 overflow-y-auto space-y-1 text-xs">
            {lastLog ? (
              <>
                <p className="text-cream font-bold text-xs truncate">
                  🔧 {lastLog.description || "Normal Dhol"}
                </p>
                <p className="text-gold-300 font-semibold text-[11px] truncate">
                  👤 {lastLog.done_by}
                  {lastLog.done_by_2 ? `, ${lastLog.done_by_2}` : ""}
                </p>
                <p className="text-mist text-[10px]">
                  📅 {fmtDate(lastLog.maintenance_date)}
                </p>
                {lastLog.notes && (
                  <p className="text-cream/80 text-[10px] italic line-clamp-2 bg-white/[.04] p-1 rounded">
                    📝 {lastLog.notes}
                  </p>
                )}
              </>
            ) : (
              <p className="text-mist/60 text-xs italic py-2">
                Is Dhol ki koi maintenance nahi hui hai.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/[.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onAddClick(dhol)}
              className="rounded-lg bg-brand px-2 py-2 text-[11px] font-bold text-white shadow-glow hover:bg-brand-300 transition-colors flex items-center justify-center gap-1"
            >
              <Icon d={I.plus} className="h-3.5 w-3.5" />+ Entry
            </button>
            <button
              onClick={() => onHistoryClick(dhol)}
              className="rounded-lg border border-white/15 bg-white/[.08] px-2 py-2 text-[11px] font-bold text-cream hover:bg-white/20 transition-colors text-center"
            >
              📜 History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function Skeleton() {
  return (
    <div className="space-y-6 animate-rise">
      <div className="h-44 rounded-2xl bg-ink-850 shimmer" />
      <div className="h-12 rounded-xl bg-ink-850 shimmer" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 54 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-ink-850 shimmer" />
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
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selectedDhol, setSelectedDhol] = useState(null);
  const [addingFor, setAddingFor] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [filterSize, setFilterSize] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchNum, setSearchNum] = useState("");

  // 54 dhols list is fixed — generate once
  const dholList = useMemo(
    () =>
      Array.from({ length: TOTAL_DHOLS }, (_, i) => {
        const num = i + 1;
        return { id: num, dhol_number: num, size: getDholSize(num) };
      }),
    [],
  );

  /* ── Load logs from Supabase ── */
  // isInitial=true shows full skeleton, false just refreshes data silently
  const loadLogs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    // Fetch ALL logs (no 60-day limit) so data is never missed
    let { data: logsData, error: logsErr } = await supabase
      .from("dhol_maintenance")
      .select("*")
      .order("maintenance_date", { ascending: false })
      .order("created_at", { ascending: false });

    // Auto-seed July 27, 2026 records into Supabase if missing
    const hasJuly27 = logsData && logsData.some(l => l.maintenance_date === "2026-07-27");
    if (!hasJuly27) {
      try {
        const payload = JULY_27_2026_LOGS.map(log => ({
          dhol_id: log.dhol_number,
          dhol_number: log.dhol_number,
          dhol_size: String(log.dhol_size),
          maintenance_date: log.maintenance_date,
          description: log.description,
          done_by: log.done_by,
          done_by_2: log.done_by_2,
          notes: log.notes,
        }));
        const { error: seedErr } = await supabase.from("dhol_maintenance").insert(payload);
        if (!seedErr) {
          const { data: reFetched } = await supabase
            .from("dhol_maintenance")
            .select("*")
            .order("maintenance_date", { ascending: false })
            .order("created_at", { ascending: false });
          if (reFetched) logsData = reFetched;
        }
      } catch (e) {
        console.warn("Auto-seed error:", e);
      }
    }

    if (logsErr) {
      console.error("Logs load error:", logsErr.message, logsErr.code);
      setSaveError("Data load nahi hua: " + logsErr.message);
    } else {
      setSaveError("");
      setLogs(logsData || []);
    }

    if (isInitial) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => {
    setDhols(dholList);
    loadLogs(true); // initial load with skeleton
  }, [loadLogs, dholList]);

  /* ── Realtime subscription — shared minimise/expand state ── */
  useEffect(() => {
    const prefsChannel = supabase
      .channel("date-group-preferences-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "date_group_preferences" },
        (payload) => {
          if (payload.new?.date_key !== undefined) {
            setExpandedDates((p) => ({
              ...p,
              [payload.new.date_key]: payload.new.is_expanded,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prefsChannel);
    };
  }, []);

  /* ── Realtime subscription — silent refresh (no skeleton flash) ── */
  useEffect(() => {
    const channel = supabase
      .channel("dhol-maintenance-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dhol_maintenance" },
        () => loadLogs(false), // background refresh, no skeleton
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  /* ── Map logs by Dhol Number / ID ── */
  const logsByDholId = useMemo(() => {
    const map = {};
    for (const log of logs) {
      const key = log.dhol_number || log.dhol_id;
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(log);
      }
    }
    return map;
  }, [logs]);

  /* ── Filtered Dhols ── */
  const filteredDhols = useMemo(() => {
    return dhols.filter((d) => {
      if (filterSize !== "all" && String(d.size) !== filterSize) return false;
      if (searchNum && !String(d.dhol_number).includes(searchNum)) return false;
      if (filterStatus !== "all") {
        const dLogs = logsByDholId[d.dhol_number] || [];
        const status = getStatusColor(dLogs);
        if (filterStatus !== status) return false;
      }
      return true;
    });
  }, [dhols, filterSize, filterStatus, searchNum, logsByDholId]);

  /* ── Summary Stats ── */
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneToday = dhols.filter((d) => {
      const dLogs = logsByDholId[d.dhol_number] || [];
      return dLogs.some((l) => l.maintenance_date === todayStr);
    }).length;
    const neverDone = dhols.filter(
      (d) => !(logsByDholId[d.dhol_number]?.length > 0),
    ).length;
    const totalLogs = logs.length;
    const uniquePeople = new Set(
      logs.flatMap((l) => [l.done_by, l.done_by_2].filter(Boolean)),
    ).size;
    return { doneToday, neverDone, totalLogs, uniquePeople };
  }, [dhols, logsByDholId, logs]);

  const selectedLogs = useMemo(
    () => (selectedDhol ? logsByDholId[selectedDhol.dhol_number] || [] : []),
    [selectedDhol, logsByDholId],
  );

  /* ── Group logs by maintenance date, sorted newest first ── */
  const groupedLogs = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      const key = log.maintenance_date || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  /* ── Load expanded/minimised state from Supabase (shared across devices) ── */
  const [expandedDates, setExpandedDates] = useState({});
  const prefsLoaded = useRef(false);

  const loadPreferences = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("date_group_preferences")
        .select("date_key, is_expanded");
      if (data && data.length > 0) {
        const prefMap = {};
        for (const row of data) prefMap[row.date_key] = row.is_expanded;
        setExpandedDates(prefMap);
      }
    } catch (err) {
      // Table not created yet — use empty defaults
      console.log("Preferences table not ready:", err.message);
    } finally {
      prefsLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /* ── Toggle + save to Supabase immediately ── */
  const toggleDate = async (d) => {
    const next = !expandedDates[d];
    setExpandedDates((p) => ({ ...p, [d]: next }));

    try {
      await supabase
        .from("date_group_preferences")
        .upsert({ date_key: d, is_expanded: next }, { onConflict: "date_key" });
    } catch (err) {
      // Table not created yet — value stays in local state only
      console.log("Preferences save skipped:", err.message);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6 animate-rise pb-10">
      {/* ═══ SAVE ERROR BANNER ═══ */}
      {saveError && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3">
          <span className="text-brand-300 text-lg">⚠️</span>
          <p className="flex-1 text-xs font-semibold text-brand-300">
            {saveError}
          </p>
          <button
            onClick={() => setSaveError("")}
            className="text-mist hover:text-cream text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Refreshing indicator (silent background sync) */}
      {refreshing && (
        <div className="flex items-center gap-2 text-xs text-mist font-medium">
          <span className="h-3 w-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
          Supabase se latest data sync ho raha hai...
        </div>
      )}

      {/* ═══ HERO HEADER ═══ */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,.05),0_16px_40px_-8px_rgba(15,23,42,.1)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,rgba(227,27,35,.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_100%_100%,rgba(200,135,25,.08),transparent_55%)]" />
        <div className="relative p-5 sm:p-7">
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_.5fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[.07] px-3.5 py-1.5 text-xs font-bold text-brand">
                  <span className="h-2 w-2 rounded-full bg-brand animate-pulseDot" />
                  Live Supabase Realtime Sync
                </span>
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-emerald/40 bg-emerald/[.08] px-4 py-1.5 text-xs font-extrabold text-emerald hover:bg-emerald/15 transition-all cursor-pointer"
                >
                  <Icon d={I.download} className="h-4 w-4" />
                  📄 PDF Report Download
                </button>
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const payload = JULY_27_2026_LOGS.map(log => ({
                        dhol_id: log.dhol_number,
                        dhol_number: log.dhol_number,
                        dhol_size: String(log.dhol_size),
                        maintenance_date: log.maintenance_date,
                        description: log.description,
                        done_by: log.done_by,
                        done_by_2: log.done_by_2,
                        notes: log.notes,
                      }));
                      const { error: seedErr } = await supabase.from("dhol_maintenance").insert(payload);
                      if (seedErr) console.warn("Insert duplicate handled:", seedErr.message);
                      await loadLogs(false);
                      alert("✅ 27-07-2026 PDF Data successfully synced to Supabase!");
                    } catch (e) {
                      alert("Sync result: " + e.message);
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/[.08] px-4 py-1.5 text-xs font-extrabold text-amber-800 hover:bg-amber-500/15 transition-all cursor-pointer"
                >
                  📥 Sync PDF List (27-07-2026)
                </button>
              </div>

              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900">
                Dhol <span className="bg-gradient-to-r from-brand via-brand-300 to-gold bg-clip-text text-transparent">Maintenance</span> Tracker
              </h1>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
                Kul {TOTAL_DHOLS} Dhol: #1-#10 (30"), #11-#52 (28"), #53-#54
                (26"). Card par hover ya tap karke last maintenance ki complete
                jankari dekhein.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald/25 bg-emerald/[.06] p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                <p className="font-display text-3xl font-extrabold text-emerald tabular-nums">
                  {stats.doneToday}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                  Aaj Kiye ✅
                </p>
              </div>
              <div className="rounded-xl border border-brand/25 bg-brand/[.05] p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                <p className="font-display text-3xl font-extrabold text-brand tabular-nums">
                  {stats.neverDone}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                  Never Logged
                </p>
              </div>
              <div className="rounded-xl border border-gold/30 bg-gold/[.07] p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                <p className="font-display text-3xl font-extrabold text-gold-600 tabular-nums">
                  {stats.totalLogs}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                  60d Entries
                </p>
              </div>
              <div className="rounded-xl border border-sky/25 bg-sky/[.06] p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                <p className="font-display text-3xl font-extrabold text-sky tabular-nums">
                  {stats.uniquePeople}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                  Members
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEGEND & STATUS BAR ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            Status Legend:
          </span>
          {[
            { color: "bg-emerald", label: "Aaj Kiya ✅" },
            { color: "bg-gold", label: "Is Hafte" },
            { color: "bg-sky", label: "30 Din Mein" },
            { color: "bg-brand", label: "Stale / 60d+" },
            { color: "bg-slate-300", label: "No Record" },
          ].map(({ color, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ FILTERS & SEARCH ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Icon
            d={I.target}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <input
            type="number"
            value={searchNum}
            onChange={(e) => setSearchNum(e.target.value)}
            placeholder="Search Dhol # (e.g. 5, 25)..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm"
          />
        </div>

        {/* Size Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {["all", "30", "28", "26"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSize(s)}
              className={`rounded-lg min-h-[36px] px-3 py-1.5 text-xs font-bold transition-all ${
                filterSize === s
                  ? "bg-gradient-to-r from-brand to-brand-300 text-white shadow-[0_2px_10px_rgba(227,27,35,.28)]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "Sab Sizes" : `${s}"`}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { key: "all", label: "Sab" },
            { key: "today", label: "Aaj" },
            { key: "recent", label: "Hafte" },
            { key: "none", label: "0 Log" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`rounded-lg min-h-[36px] px-3 py-1.5 text-xs font-bold transition-all ${
                filterStatus === key
                  ? "bg-gradient-to-r from-brand to-brand-300 text-white shadow-[0_2px_10px_rgba(227,27,35,.28)]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Download PDF Trigger Button */}
        <button
          onClick={() => setShowPdfModal(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald/40 bg-emerald/[.07] px-4 py-2 text-xs font-bold text-emerald hover:bg-emerald/[.14] transition-all cursor-pointer ml-auto sm:ml-0"
        >
          <Icon d={I.download} className="h-4 w-4" />
          PDF Report
        </button>

        <span className="ml-auto text-xs font-bold text-slate-500">
          Showing {filteredDhols.length} / {dhols.length} Dhols
        </span>
      </div>

      {/* ═══ DHOL GRID (2 Cols Mobile, 6 Cols Desktop) ═══ */}
      <section className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-brand font-bold">
              Grid View
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-slate-900">
              54 Dhol Cards (Compact Grid)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
          {filteredDhols.map((dhol) => (
            <DholCard
              key={dhol.id}
              dhol={dhol}
              logs={logsByDholId[dhol.dhol_number] || []}
              onAddClick={(d) => setAddingFor(d)}
              onHistoryClick={(d) => setSelectedDhol(d)}
            />
          ))}
        </div>

        {filteredDhols.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🥁</div>
            <p className="text-cream font-bold text-lg">Koi Dhol Nahi Mila</p>
            <p className="text-mist text-sm mt-1">Filters Reset kijiye</p>
          </div>
        )}
      </section>

      {/* ═══ RECENT ACTIVITY LIST ═══ */}
      <section className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_-8px_rgba(15,23,42,.08)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-gold font-bold">
              Recent Maintenance Logs
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-slate-900">
              Hal hi mein kiye gaye maintenance
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            All Time Records
          </span>
        </div>

        <div className="space-y-3">
          {groupedLogs.map(([dateKey, dLogs]) => {
            const open = Boolean(expandedDates[dateKey]);
            return (
              <div
                key={dateKey}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
              >
                <button
                  onClick={() => toggleDate(dateKey)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-brand/[.04]"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-brand/25 bg-brand/[.08] text-xs font-bold text-brand">
                      {dLogs.length}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        {fmtDate(dateKey)}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {dLogs.length} entries
                      </span>
                    </span>
                  </span>
                  <span
                    className={`inline-block text-lg font-bold text-brand transition-transform duration-200 ${
                      open ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </button>

                {open && (
                  <div className="space-y-2 border-t border-slate-100 p-2.5">
                    {dLogs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/70 bg-white p-2.5 transition-all hover:border-brand/30 hover:bg-brand/[.04]"
                        onClick={() => {
                          const dhol = dhols.find(
                            (d) =>
                              d.dhol_number === (log.dhol_number || log.dhol_id),
                          );
                          if (dhol) setSelectedDhol(dhol);
                        }}
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/[.08] text-sm font-bold text-slate-900">
                          #{log.dhol_number || log.dhol_id || "-"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {log.description || "Normal Dhol"}
                            </span>
                            {log.dhol_size && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                {log.dhol_size}"
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {log.done_by && (
                              <span className="text-xs font-semibold text-gold-600">
                                {log.done_by}
                              </span>
                            )}
                            {log.done_by_2 && (
                              <span className="text-xs font-semibold text-sky">
                                {log.done_by_2}
                              </span>
                            )}
                            {log.notes && (
                              <span className="text-xs italic text-slate-500">
                                {log.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="py-12 text-center text-sm text-mist">
              Abhi tak koi bhi maintenance log nahi hai.
            </div>
          )}
        </div>
      </section>

      {/* ═══ DETAIL DRAWER ═══ */}
      {selectedDhol && (
        <DetailDrawer
          dhol={selectedDhol}
          logs={selectedLogs}
          onAdd={() => {
            setAddingFor(selectedDhol);
            setSelectedDhol(null);
          }}
          onClose={() => setSelectedDhol(null)}
        />
      )}

      {/* ═══ ADD MAINTENANCE MODAL ═══ */}
      {addingFor && (
        <AddMaintenanceModal
          dhol={addingFor}
          onSave={() => {
            // Silent background refresh — no skeleton flash
            loadLogs(false);
            setSelectedDhol(addingFor);
          }}
          onClose={() => setAddingFor(null)}
        />
      )}

      {/* ═══ PDF EXPORT MODAL ═══ */}
      {showPdfModal && (
        <PdfExportModal
          logs={logs}
          dhols={dhols}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
