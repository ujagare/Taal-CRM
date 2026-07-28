import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

/* ─────────────────────────────────────────────
   CONSTANTS & CONFIG
───────────────────────────────────────────── */
const TOTAL_DHOLS = 54;
const HISTORY_DAYS = 60;

// Size Rule: #1-#10 = 30", #11-#52 = 28", #53-#54 = 26"
function getDholSize(num) {
  if (num <= 10) return 30;
  if (num >= 53) return 26;
  return 28;
}

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
      if (sizeFilter !== "all" && String(log.dhol_size) !== sizeFilter) {
        return false;
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
      let rangeTitle = "Aaj Ka Din (Today)";
      if (rangeType === "week") rangeTitle = "Pichle 7 Din (Week)";
      else if (rangeType === "month") rangeTitle = "Pichle 30 Din (Month)";
      else if (rangeType === "custom")
        rangeTitle = `${fmtDate(startDate)} se ${fmtDate(endDate)} tak`;

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 12;
      const contentW = pageW - margin * 2;

      // ── PAGE 1: COVER PAGE ──────────────────────────────────────────
      // Deep navy background
      doc.setFillColor(10, 15, 28);
      doc.rect(0, 0, pageW, pageH, "F");

      // Top accent stripe (red gradient simulation)
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageW, 6, "F");

      // Left accent vertical bar
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, 4, pageH, "F");

      // Gold diagonal decorative strip
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 6, pageW, 1.5, "F");

      // Large logo / icon placeholder area
      doc.setFillColor(25, 35, 60);
      doc.roundedRect(margin + 4, 35, contentW - 8, 55, 6, 6, "F");

      // Drum icon text placeholder (emoji-based)
      doc.setFontSize(36);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text("🥁", pageW / 2, 58, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(180, 140, 60);
      doc.setFont("helvetica", "bold");
      doc.text("TAAL CRM — INSTRUMENT MAINTENANCE SYSTEM", pageW / 2, 72, {
        align: "center",
      });

      // Main Title
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("DHOL MAINTENANCE", pageW / 2, 115, { align: "center" });

      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text("REPORT", pageW / 2, 128, { align: "center" });

      // Divider line
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.8);
      doc.line(margin + 20, 135, pageW - margin - 20, 135);

      // Report period badge
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(margin + 30, 140, contentW - 60, 14, 4, 4, "F");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(rangeTitle, pageW / 2, 149, { align: "center" });

      // Stats boxes row
      const boxY = 168;
      const boxH = 28;
      const boxes = [
        {
          label: "TOTAL RECORDS",
          value: String(filteredLogs.length),
          color: [220, 38, 38],
        },
        {
          label: "UNIQUE DHOLS",
          value: String(
            new Set(filteredLogs.map((l) => l.dhol_number || l.dhol_id)).size,
          ),
          color: [245, 158, 11],
        },
        {
          label: "TEAM MEMBERS",
          value: String(
            new Set(
              filteredLogs.flatMap((l) =>
                [l.done_by, l.done_by_2].filter(Boolean),
              ),
            ).size,
          ),
          color: [34, 197, 94],
        },
        {
          label: "GENERATED ON",
          value: fmtDate(todayStr).replace(",", ""),
          color: [14, 165, 233],
        },
      ];
      const boxW = contentW / 4;
      boxes.forEach((b, i) => {
        const bx = margin + i * boxW;
        doc.setFillColor(25, 35, 60);
        doc.roundedRect(bx, boxY, boxW - 2, boxH, 3, 3, "F");
        doc.setFillColor(...b.color);
        doc.roundedRect(bx, boxY, boxW - 2, 3, 1, 1, "F");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(b.value, bx + (boxW - 2) / 2, boxY + 14, { align: "center" });
        doc.setFontSize(6.5);
        doc.setTextColor(150, 160, 180);
        doc.setFont("helvetica", "bold");
        doc.text(b.label, bx + (boxW - 2) / 2, boxY + 22, { align: "center" });
      });

      // Maintenance type breakdown
      if (filteredLogs.length > 0) {
        const typeCount = {};
        filteredLogs.forEach((l) => {
          const t = l.description || "Normal Dhol";
          typeCount[t] = (typeCount[t] || 0) + 1;
        });
        const types = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

        doc.setFontSize(8);
        doc.setTextColor(180, 140, 60);
        doc.setFont("helvetica", "bold");
        doc.text("MAINTENANCE TYPE BREAKDOWN", margin + 4, 210);

        doc.setDrawColor(50, 60, 90);
        doc.setLineWidth(0.3);
        doc.line(margin + 4, 212, pageW - margin - 4, 212);

        let typeY = 218;
        types.slice(0, 6).forEach(([name, count]) => {
          const pct = Math.round((count / filteredLogs.length) * 100);
          const barW = Math.max(
            2,
            (count / filteredLogs.length) * (contentW - 40),
          );

          doc.setFontSize(7.5);
          doc.setTextColor(220, 220, 235);
          doc.setFont("helvetica", "normal");
          doc.text(name.substring(0, 28), margin + 4, typeY);
          doc.text(`${count} (${pct}%)`, pageW - margin - 4, typeY, {
            align: "right",
          });

          // Progress bar bg
          doc.setFillColor(30, 40, 65);
          doc.roundedRect(margin + 4, typeY + 1.5, contentW - 8, 3, 1, 1, "F");
          // Progress bar fill
          doc.setFillColor(220, 38, 38);
          doc.roundedRect(margin + 4, typeY + 1.5, barW, 3, 1, 1, "F");

          typeY += 10;
        });
      }

      // Footer on cover
      doc.setFillColor(20, 28, 48);
      doc.rect(0, pageH - 16, pageW, 16, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 115, 140);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Taal CRM — Dhol Maintenance Management System  |  Confidential & Internal Use Only",
        pageW / 2,
        pageH - 8,
        { align: "center" },
      );
      doc.text(`Page 1 of 2`, pageW - margin, pageH - 8, { align: "right" });

      // ── PAGE 2: DETAILED TABLE ──────────────────────────────────────
      doc.addPage();

      // Page 2 dark background
      doc.setFillColor(10, 15, 28);
      doc.rect(0, 0, pageW, pageH, "F");

      // Left accent bar
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, 4, pageH, "F");

      // Page header
      doc.setFillColor(20, 30, 55);
      doc.rect(4, 0, pageW - 4, 22, "F");

      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED MAINTENANCE LOG", margin, 10);

      doc.setFontSize(8);
      doc.setTextColor(180, 140, 60);
      doc.text(`Period: ${rangeTitle}`, margin, 17);
      doc.setTextColor(120, 135, 160);
      doc.text(`Total: ${filteredLogs.length} Records`, pageW - margin, 17, {
        align: "right",
      });

      // Column definitions
      const cols = [
        { label: "#", x: margin, w: 8 },
        { label: "DATE", x: margin + 8, w: 26 },
        { label: "DHOL", x: margin + 34, w: 16 },
        { label: "SIZE", x: margin + 50, w: 14 },
        { label: "MAINTENANCE TYPE", x: margin + 64, w: 54 },
        { label: "DONE BY", x: margin + 118, w: 50 },
        { label: "NOTES", x: margin + 168, w: contentW - 156 },
      ];

      // Table header
      let y = 28;
      doc.setFillColor(220, 38, 38);
      doc.rect(4, y - 5, pageW - 4, 9, "F");

      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      cols.forEach((c) => doc.text(c.label, c.x, y));

      y += 6;

      if (filteredLogs.length === 0) {
        doc.setFillColor(25, 35, 60);
        doc.rect(4, y, pageW - 4, 20, "F");
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 200);
        doc.text(
          "Is period mein koi maintenance record nahi mila.",
          pageW / 2,
          y + 12,
          { align: "center" },
        );
      } else {
        filteredLogs.forEach((log, index) => {
          if (y > 278) {
            // Footer
            doc.setFillColor(20, 28, 48);
            doc.rect(0, pageH - 16, pageW, 16, "F");
            doc.setFontSize(7);
            doc.setTextColor(100, 115, 140);
            doc.text(
              `Taal CRM — Dhol Maintenance Report  |  ${rangeTitle}`,
              pageW / 2,
              pageH - 8,
              { align: "center" },
            );

            doc.addPage();
            // New page dark bg
            doc.setFillColor(10, 15, 28);
            doc.rect(0, 0, pageW, pageH, "F");
            doc.setFillColor(220, 38, 38);
            doc.rect(0, 0, 4, pageH, "F");

            y = 16;
            // Repeat header
            doc.setFillColor(220, 38, 38);
            doc.rect(4, y - 5, pageW - 4, 9, "F");
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            cols.forEach((c) => doc.text(c.label, c.x, y));
            y += 6;
          }

          const rowH = 7;
          // Alternating row colors (dark theme)
          if (index % 2 === 0) {
            doc.setFillColor(18, 26, 48);
          } else {
            doc.setFillColor(14, 20, 38);
          }
          doc.rect(4, y - 4.5, pageW - 4, rowH, "F");

          // Highlight today's entries
          const todayCheck = new Date().toISOString().slice(0, 10);
          if (log.maintenance_date === todayCheck) {
            doc.setFillColor(34, 80, 34);
            doc.rect(4, y - 4.5, pageW - 4, rowH, "F");
          }

          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");

          // Row number
          doc.setTextColor(150, 160, 180);
          doc.text(String(index + 1), cols[0].x, y);

          // Date
          doc.setTextColor(200, 210, 230);
          doc.text(fmtDate(log.maintenance_date), cols[1].x, y);

          // Dhol number (highlighted)
          doc.setTextColor(240, 80, 80);
          doc.setFont("helvetica", "bold");
          doc.text(
            `#${String(log.dhol_number || log.dhol_id || "—")}`,
            cols[2].x,
            y,
          );

          // Size
          doc.setTextColor(245, 158, 11);
          doc.setFont("helvetica", "bold");
          doc.text(`${log.dhol_size || "—"}"`, cols[3].x, y);

          // Description
          doc.setTextColor(220, 220, 235);
          doc.setFont("helvetica", "normal");
          const desc = (log.description || "Normal Dhol").substring(0, 28);
          doc.text(desc, cols[4].x, y);

          // Done by
          doc.setTextColor(100, 200, 140);
          const doneBy1 = (log.done_by || "—").substring(0, 14);
          doc.text(`👤 ${doneBy1}`, cols[5].x, y);
          if (log.done_by_2) {
            doc.setTextColor(80, 170, 220);
            const doneBy2 = log.done_by_2.substring(0, 14);
            doc.text(`👤 ${doneBy2}`, cols[5].x + 24, y);
          }

          // Notes
          doc.setTextColor(140, 150, 170);
          doc.setFont("helvetica", "italic");
          if (log.notes) {
            doc.text(log.notes.substring(0, 18), cols[6].x, y);
          } else {
            doc.text("—", cols[6].x, y);
          }

          // Bottom border line per row
          doc.setDrawColor(30, 40, 65);
          doc.setLineWidth(0.2);
          doc.line(4, y + 2.5, pageW - 4, y + 2.5);

          y += rowH;
        });
      }

      // Footer on page 2
      doc.setFillColor(20, 28, 48);
      doc.rect(0, pageH - 16, pageW, 16, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 115, 140);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Taal CRM — Dhol Maintenance Report  |  ${rangeTitle}`,
        pageW / 2,
        pageH - 8,
        { align: "center" },
      );
      doc.text(`Generated: ${fmtDate(todayStr)}`, pageW - margin, pageH - 8, {
        align: "right",
      });

      const fileName = `Dhol_Maintenance_${rangeType}_${todayStr}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (err) {
      console.error("PDF Download Error:", err);
      alert("PDF generate nahi ho paya: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl animate-rise">
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
                <option value="30">30&quot; Size (#1-#25)</option>
                <option value="28">28&quot; Size (#26-#52)</option>
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
                  <p className="text-[9px] text-mist">2 Pages</p>
                  <p className="text-[9px] text-mist">Dark Theme</p>
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
                    Page 1: Cover
                  </p>
                  <div className="space-y-0.5">
                    <div className="h-1 w-full rounded bg-brand/40" />
                    <div className="h-1 w-3/4 rounded bg-white/20" />
                    <div className="h-1 w-1/2 rounded bg-gold/30" />
                    <div className="grid grid-cols-4 gap-0.5 mt-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-2 rounded bg-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-white/[.03] border border-white/[.06] p-2">
                  <p className="text-[9px] font-bold text-cream mb-1">
                    Page 2: Data Table
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
                ✅ Premium dark-theme PDF • Cover + Table layout
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-ink-900 shadow-2xl animate-rise max-h-[85vh] sm:max-h-[90vh] flex flex-col">
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
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-md">
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
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-300 active:scale-98"
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

/* ─────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────── */
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
    const { data: logsData, error: logsErr } = await supabase
      .from("dhol_maintenance")
      .select("*")
      .order("maintenance_date", { ascending: false })
      .order("created_at", { ascending: false });

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
      <section className="dashboard-hero overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-premium">
        <div className="relative p-5 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(220,38,38,.15),transparent_60%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_.5fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand-300">
                  <span className="h-2 w-2 rounded-full bg-brand animate-pulseDot" />
                  Live Supabase Realtime Sync
                </span>
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/20 px-4 py-1.5 text-xs font-extrabold text-emerald hover:bg-emerald/30 shadow-glow transition-all cursor-pointer"
                >
                  <Icon d={I.download} className="h-4 w-4" />
                  📄 PDF Report Download
                </button>
              </div>

              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-cream">
                Dhol Maintenance Tracker
              </h1>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm text-mist leading-relaxed">
                Kul {TOTAL_DHOLS} Dhol: #1-#25 (30"), #26-#52 (28"), #53-#54
                (26"). Card par hover ya tap karke last maintenance ki complete
                jankari dekhein.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald/30 bg-emerald/10 p-3 text-center">
                <p className="font-display text-3xl font-extrabold text-emerald tabular-nums">
                  {stats.doneToday}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mist font-bold mt-0.5">
                  Aaj Kiye ✅
                </p>
              </div>
              <div className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-center">
                <p className="font-display text-3xl font-extrabold text-brand-300 tabular-nums">
                  {stats.neverDone}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mist font-bold mt-0.5">
                  Never Logged
                </p>
              </div>
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-center">
                <p className="font-display text-3xl font-extrabold text-gold-300 tabular-nums">
                  {stats.totalLogs}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mist font-bold mt-0.5">
                  60d Entries
                </p>
              </div>
              <div className="rounded-xl border border-sky/30 bg-sky/10 p-3 text-center">
                <p className="font-display text-3xl font-extrabold text-sky tabular-nums">
                  {stats.uniquePeople}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mist font-bold mt-0.5">
                  Members
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEGEND & STATUS BAR ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-mist font-bold">
            Status Legend:
          </span>
          {[
            { color: "bg-emerald", label: "Aaj Kiya ✅" },
            { color: "bg-gold-300", label: "Is Hafte" },
            { color: "bg-sky", label: "30 Din Mein" },
            { color: "bg-brand", label: "Stale / 60d+" },
            { color: "bg-white/20", label: "No Record" },
          ].map(({ color, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-xs text-cream font-medium"
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-mist"
          />
          <input
            type="number"
            value={searchNum}
            onChange={(e) => setSearchNum(e.target.value)}
            placeholder="Search Dhol # (e.g. 5, 25)..."
            className="w-full rounded-xl border border-white/10 bg-ink-900 pl-10 pr-3 py-2.5 text-sm text-cream placeholder:text-mist/50 focus:border-brand focus:outline-none"
          />
        </div>

        {/* Size Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
          {["all", "30", "28", "26"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSize(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterSize === s
                  ? "bg-brand text-white shadow-glow"
                  : "text-mist hover:text-cream"
              }`}
            >
              {s === "all" ? "Sab Sizes" : `${s}"`}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
          {[
            { key: "all", label: "Sab" },
            { key: "today", label: "Aaj" },
            { key: "recent", label: "Hafte" },
            { key: "none", label: "0 Log" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterStatus === key
                  ? "bg-brand text-white shadow-glow"
                  : "text-mist hover:text-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Download PDF Trigger Button */}
        <button
          onClick={() => setShowPdfModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald/20 border border-emerald/40 px-3.5 py-2 text-xs font-bold text-emerald hover:bg-emerald/30 transition-all cursor-pointer ml-auto sm:ml-0"
        >
          <Icon d={I.download} className="h-4 w-4" />
          PDF Report
        </button>

        <span className="ml-auto text-xs font-bold text-mist">
          Showing {filteredDhols.length} / {dhols.length} Dhols
        </span>
      </div>

      {/* ═══ DHOL GRID (2 Cols Mobile, 6 Cols Desktop) ═══ */}
      <section className="rounded-2xl border border-white/10 bg-ink-850/60 p-3.5 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-brand-300 font-bold">
              Grid View
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-cream">
              54 Dhol Cards (Mobile: 2 Cards / Line)
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
      <section className="rounded-2xl border border-white/10 bg-ink-850/80 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-gold-300 font-bold">
              Recent Maintenance Logs
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-cream">
              Hal hi mein kiye gaye maintenance
            </h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-semibold text-mist">
            All Time Records
          </span>
        </div>

        <div className="space-y-2.5">
          {logs.slice(0, 15).map((log, i) => (
            <div
              key={log.id || i}
              className="flex items-start gap-3 rounded-xl border border-white/[.08] bg-white/[.02] p-3 hover:bg-white/[.05] cursor-pointer transition-colors"
              onClick={() => {
                const dhol = dhols.find(
                  (d) => d.dhol_number === (log.dhol_number || log.dhol_id),
                );
                if (dhol) setSelectedDhol(dhol);
              }}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 border border-brand/30 font-bold text-brand-300 text-sm">
                #{log.dhol_number || log.dhol_id || "—"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-cream">
                    {log.description || "Normal Dhol"}
                  </span>
                  {log.dhol_size && (
                    <span className="text-[10px] font-bold text-mist bg-white/10 rounded-full px-2 py-0.5">
                      {log.dhol_size}"
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {log.done_by && (
                    <span className="text-xs text-gold-300 font-semibold">
                      👤 {log.done_by}
                    </span>
                  )}
                  {log.done_by_2 && (
                    <span className="text-xs text-sky font-semibold">
                      👤 {log.done_by_2}
                    </span>
                  )}
                  {log.notes && (
                    <span className="text-xs text-mist italic truncate max-w-xs">
                      📝 {log.notes}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-mist font-medium shrink-0">
                📅 {fmtDate(log.maintenance_date)}
              </span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-12 text-center text-mist text-sm">
              Abhi tak koi bhi maintenance log nahi hai. Pehla entry add karo!
              🥁
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
