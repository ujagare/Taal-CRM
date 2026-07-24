import { Fragment, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { sendWhatsApp } from "../utils/whatsapp";
import localMembersRaw from "../../scripts/members_data.json";

const LOCAL_MEMBERS = localMembersRaw.map((m, i) => ({
  id: i + 1,
  ...m,
  exam_status: "pending",
  exam_score: null,
  exam_notes: null,
  exam_rhythm: null,
  exam_physical: null,
  exam_attitude: null,
  batch_assigned: null,
  shortlisted: false,
  created_at: new Date().toISOString(),
}));

const INSTRUMENTS = ["ढोल", "ताशा", "कोणतेच नाही", "ढोल, ताशा"];
const EXPERIENCE_LEVELS = ["Fresher", "1-3 Years  (१-३ वर्षे)", "3-7 Years (३-७ वर्षे)", "7 Years and Above (७ किंवा त्या पेक्षा जास्त)"];
const BATCHES = ["Batch A (Morning)", "Batch B (Evening)", "Batch C (Weekend)", "Reserve"];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── PDF Report Generator ─────────────────────────── */
async function downloadNewMemberExamPDF(records, filterTitle = "Exam Report") {
  const dateStr = formatDate(new Date());
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const passedCount = records.filter(r => r.exam_status === "passed").length;
  const failedCount = records.filter(r => r.exam_status === "failed").length;
  const pendingCount = records.filter(r => (!r.exam_status || r.exam_status === "pending")).length;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:0;top:99999px;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;visibility:visible;display:block;";

  container.innerHTML = `
    <div>
      <div style="text-align:center;margin-bottom:24px;">
        <img src="/taal-pathak-logo-red.png" style="height:75px;width:auto;margin:0 auto 12px;display:block;" />
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.5px;">TAAL Pathak — New Member Exam Report</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-weight:500;">Category: ${filterTitle} — ${dateStr} (${timeStr})</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Total Candidates</div>
          <div style="font-size:28px;font-weight:700;color:#111827;margin-top:4px;">${records.length}</div>
        </div>
        <div style="background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#047857;font-weight:600;text-transform:uppercase;">Passed (✅)</div>
          <div style="font-size:28px;font-weight:700;color:#047857;margin-top:4px;">${passedCount}</div>
        </div>
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#DC2626;font-weight:600;text-transform:uppercase;">Failed (❌)</div>
          <div style="font-size:28px;font-weight:700;color:#DC2626;margin-top:4px;">${failedCount}</div>
        </div>
        <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#D97706;font-weight:600;text-transform:uppercase;">Pending (⏳)</div>
          <div style="font-size:28px;font-weight:700;color:#D97706;margin-top:4px;">${pendingCount}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #E5E7EB;">
        <thead>
          <tr style="background:#111827;color:#FFF;">
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;width:28px;">#</th>
            <th style="padding:9px 6px;text-align:left;font-size:10px;font-weight:700;border:1px solid #111827;">Full Name</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Instrument</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">1 to 7 Haat</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Gavthi</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Taal Theke</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Score</th>
            <th style="padding:9px 6px;text-align:center;font-size:10px;font-weight:700;border:1px solid #111827;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => {
            const st = r.exam_status || "pending";
            const stColor = st === "passed" ? "#047857" : st === "failed" ? "#DC2626" : "#D97706";
            const stBg = st === "passed" ? "#ECFDF5" : st === "failed" ? "#FEF2F2" : "#FFFBEB";
            return `
              <tr style="background:#FFF;border-bottom:1px solid #E5E7EB;">
                <td style="padding:8px 6px;text-align:center;color:#6B7280;font-weight:600;border:1px solid #E5E7EB;">${i + 1}</td>
                <td style="padding:8px 6px;text-align:left;color:#111827;font-weight:700;border:1px solid #E5E7EB;">${r.full_name || "—"}</td>
                <td style="padding:8px 6px;text-align:center;color:#374151;border:1px solid #E5E7EB;">${(r.instruments_played || "—").replace("कोणतेच नाही", "None")}</td>
                <td style="padding:8px 6px;text-align:center;color:#374151;border:1px solid #E5E7EB;">${r.exam_rhythm || "—"}</td>
                <td style="padding:8px 6px;text-align:center;color:#374151;border:1px solid #E5E7EB;">${r.exam_physical || "—"}</td>
                <td style="padding:8px 6px;text-align:center;color:#374151;border:1px solid #E5E7EB;">${r.exam_attitude || "—"}</td>
                <td style="padding:8px 6px;text-align:center;color:#111827;font-weight:700;border:1px solid #E5E7EB;">${r.exam_score ? r.exam_score + '/10' : "—"}</td>
                <td style="padding:8px 6px;text-align:center;border:1px solid #E5E7EB;">
                  <span style="background:${stBg};color:${stColor};padding:2px 7px;border-radius:10px;font-weight:700;font-size:9.5px;text-transform:uppercase;">
                    ${st}
                  </span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div style="margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;">
        <div>TAAL PATHAK Operations CRM — Official Candidate Exam Document</div>
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

    pdf.save(`TAAL_Exam_Report_${filterTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr.replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("PDF error:", err);
  } finally {
    document.body.removeChild(container);
  }
}

/* ─── CSV / Excel Exporter ─────────────────────────── */
function downloadCSV(records, filename = "TAAL_Member_Exam_Results.csv") {
  if (!records || records.length === 0) return;

  const headers = ["ID", "Full Name", "Gender", "WhatsApp", "Email", "Instrument", "Experience", "Exam Status", "Overall Score (1-10)", "1 to 7 Haat", "Gavthi", "Taal Theke", "Notes", "Shortlisted"];
  const rows = records.map(r => [
    r.id,
    `"${(r.full_name || "").replace(/"/g, '""')}"`,
    `"${r.gender || ""}"`,
    `"${r.whatsapp || ""}"`,
    `"${r.email || ""}"`,
    `"${(r.instruments_played || "").replace(/"/g, '""')}"`,
    `"${(r.experience || "").replace(/"/g, '""')}"`,
    `"${r.exam_status || "pending"}"`,
    `"${r.exam_score || ""}"`,
    `"${r.exam_rhythm || ""}"`,
    `"${r.exam_physical || ""}"`,
    `"${r.exam_attitude || ""}"`,
    `"${(r.exam_notes || "").replace(/"/g, '""')}"`,
    `"${r.shortlisted ? "Yes" : "No"}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(String(d)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function calcAge(dobStr) {
  if (!dobStr) return "—";
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  const colors = [
    "from-red-500 to-rose-700",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-700",
    "from-blue-500 to-indigo-700",
    "from-purple-500 to-violet-700",
    "from-pink-500 to-fuchsia-700",
  ];
  const idx = (name || "").charCodeAt(0) % colors.length;
  return colors[idx];
}

/* ─── Detail Modal ─────────────────────────────────── */
function DetailModal({ member, onClose, onExamUpdate }) {
  const [examStatus, setExamStatus] = useState(member.exam_status || "pending");
  const [examScore, setExamScore] = useState(member.exam_score || "");
  const [examNotes, setExamNotes] = useState(member.exam_notes || "");
  const [examRhythm, setExamRhythm] = useState(member.exam_rhythm || "");
  const [examPhysical, setExamPhysical] = useState(member.exam_physical || "");
  const [examAttitude, setExamAttitude] = useState(member.exam_attitude || "");
  const [batchAssigned, setBatchAssigned] = useState(member.batch_assigned || "");
  const [shortlisted, setShortlisted] = useState(member.shortlisted || false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [sendingWa, setSendingWa] = useState(false);
  const [waStatusMsg, setWaStatusMsg] = useState(null);
  const [waServerOk, setWaServerOk] = useState(null); // null=checking, true=connected, false=offline

  useEffect(() => {
    // Check WhatsApp server status on mount
    fetch('http://localhost:5001/api/whatsapp/status', { signal: AbortSignal.timeout(2000) })
      .then(r => r.json())
      .then(d => setWaServerOk(d.connected === true))
      .catch(() => setWaServerOk(false));
  }, []);

  const sendAutoWhatsApp = async () => {
    if (!member.whatsapp) return;
    setSendingWa(true);
    setWaStatusMsg(null);

    const text = `जय गणेश! 🙏 *${member.full_name}*,\nताल वाद्यपथक — गणेशोत्सव २०२६ परीक्षा निकाल:\n\nनिकाल: *${(examStatus || 'pending').toUpperCase()}*\nगुण: *${examScore ? examScore + '/10' : '—'}*\n🥁 1 to 7 हात: *${examRhythm || '—'}*\n🌾 गावठी: *${examPhysical || '—'}*\n🎵 ताल ठेके: *${examAttitude || '—'}*\n\nधन्यवाद! 🥁`;

    try {
      const res = await fetch('http://localhost:5001/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: member.whatsapp, message: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaStatusMsg('✅ Automatic WhatsApp Message Sent!');
      } else {
        const url = `https://wa.me/91${member.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
        setWaStatusMsg('💬 Opening WhatsApp Web...');
      }
    } catch {
      const url = `https://wa.me/91${member.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
      setWaStatusMsg('💬 Opening WhatsApp Web...');
    }
    setSendingWa(false);
    setTimeout(() => setWaStatusMsg(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    await onExamUpdate(member.id, {
      exam_status: examStatus,
      exam_score: examScore || null,
      exam_notes: examNotes || null,
      exam_rhythm: examRhythm || null,
      exam_physical: examPhysical || null,
      exam_attitude: examAttitude || null,
      batch_assigned: batchAssigned || null,
      shortlisted,
    });
    setSaving(false);

    /* ─── AUTO WHATSAPP TRIGGER: Exam result saved ─── */
    if (member.whatsapp && (examStatus === 'passed' || examStatus === 'failed')) {
      const resultText = examStatus === 'passed'
        ? `जय गणेश! 🙏 *${member.full_name}*,\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n✅ निकाल: *PASSED*\n🏆 गुण: *${examScore || '—'}/10*\n🥁 1 to 7 हात: *${examRhythm || '—'}*\n🌾 गावठी: *${examPhysical || '—'}*\n🎵 ताल ठेके: *${examAttitude || '—'}*\n\nअभिनंदन! तुम्ही आमच्या पथकात निवडलात. 🥁`
        : `जय गणेश! 🙏 *${member.full_name}*,\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n❌ निकाल: *FAILED*\n\nया वेळी तुम्ही पास होउ शकला नाहीत.\nपुढच्या वर्षी नक्की प्रयत्न करा! 🥁`;
      sendWhatsApp(member.whatsapp, resultText).catch(() => {});
    }
  };

  const statusConfig = {
    passed: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400", label: "✅ Passed" },
    failed: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400", label: "❌ Failed" },
    pending: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400", label: "⏳ Pending" },
  };
  const sc = statusConfig[examStatus] || statusConfig.pending;

  const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-base w-5 shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-white/85 break-words">{value || "—"}</p>
      </div>
    </div>
  );

  const ScoreInput = ({ label, value, onChange, placeholder }) => (
    <div>
      <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-red-500/50 transition-all"
        style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}
      />
    </div>
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.history.pushState({ modalOpen: true }, "");
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-[#18181c] border border-white/20 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col my-auto text-white">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-4 pb-5 shrink-0 border-b border-white/8">
          {/* Close btn */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all text-sm">✕</button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(member.full_name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {getInitials(member.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white leading-tight">{member.full_name}</h2>
                {shortlisted && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">⭐ Shortlisted</span>
                )}
              </div>
              <p className="text-sm text-white/50 mt-0.5">
                {calcAge(member.dob)} yrs · {member.gender} · {member.instruments_played || "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: "Age", value: `${calcAge(member.dob)} yr` },
              { label: "Instrument", value: (member.instruments_played || "—").replace("कोणतेच नाही", "None") },
              { label: "Experience", value: (member.experience || "—").split(" ")[0] },
              { label: "Score", value: examScore || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center">
                <p className="text-[9px] text-white/40 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-white mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0 px-6">
          {[
            { id: "info", label: "📋 Info" },
            { id: "exam", label: "📝 Exam" },
            { id: "contact", label: "📞 Contact" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 space-y-4">

          {/* ── INFO TAB ── */}
          {activeTab === "info" && (
            <div className="space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <div>
                  <InfoRow icon="🎂" label="Date of Birth" value={member.dob ? `${fmtDate(member.dob)} (${calcAge(member.dob)} yrs)` : null} />
                  <InfoRow icon="⚧" label="Gender" value={member.gender} />
                  <InfoRow icon="💼" label="Profession / Occupation" value={member.profession} />
                  <InfoRow icon="🏠" label="Address" value={member.address} />
                  <InfoRow icon="🤕" label="Injury / Health Info" value={member.injury_info} />
                </div>
                <div>
                  <InfoRow icon="🥁" label="Instrument" value={member.instruments_played} />
                  <InfoRow icon="⏱" label="Experience Level" value={member.experience} />
                  <InfoRow icon="🚩" label="Flag Dancing" value={member.flag_dancing} />
                  <InfoRow icon="🎹" label="Other Instruments" value={member.other_instruments} />
                  <InfoRow icon="🎵" label="Previous Pathak" value={member.previous_pathak} />
                </div>
              </div>
              <InfoRow icon="🎯" label="Hobbies / Interests" value={member.hobbies} />
              <InfoRow icon="👤" label="Reference / Referred By" value={member.reference} />
              <InfoRow icon="📅" label="Registration Date" value={fmtDate(member.timestamp)} />
            </div>
          )}

          {/* ── EXAM TAB ── */}
          {activeTab === "exam" && (
            <div className="space-y-5">
              {/* Exam Status (Full Width) */}
              <div>
                <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">Exam Status</label>
                <select value={examStatus} onChange={e => setExamStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer font-medium"
                  style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}>
                  <option value="pending" style={{ backgroundColor: '#1c1c20', color: '#fbbf24' }}>⏳ Pending</option>
                  <option value="passed" style={{ backgroundColor: '#1c1c20', color: '#34d399' }}>✅ Passed</option>
                  <option value="failed" style={{ backgroundColor: '#1c1c20', color: '#f87171' }}>❌ Failed</option>
                </select>
              </div>

              {/* Skill Rating Dropdowns: 1 to 7 Haat, Gavthi, Taal Theke */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1 to 7 Haat */}
                <div>
                  <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">🥁 1 to 7 Haat</label>
                  <select
                    value={examRhythm}
                    onChange={e => setExamRhythm(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer font-medium"
                    style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    <option value="" style={{ backgroundColor: '#1c1c20', color: '#888' }}>-- Select --</option>
                    <option value="Not Good" style={{ backgroundColor: '#1c1c20', color: '#f87171' }}>Not Good (खराब)</option>
                    <option value="Normal" style={{ backgroundColor: '#1c1c20', color: '#fbbf24' }}>Normal (नॉर्मल)</option>
                    <option value="Good" style={{ backgroundColor: '#1c1c20', color: '#60a5fa' }}>Good (छान)</option>
                    <option value="Perfect" style={{ backgroundColor: '#1c1c20', color: '#34d399' }}>Perfect (उत्तम)</option>
                  </select>
                </div>

                {/* Gavthi */}
                <div>
                  <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">🥁 Gavthi (गावठी)</label>
                  <select
                    value={examPhysical}
                    onChange={e => setExamPhysical(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer font-medium"
                    style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    <option value="" style={{ backgroundColor: '#1c1c20', color: '#888' }}>-- Select --</option>
                    <option value="Not Good" style={{ backgroundColor: '#1c1c20', color: '#f87171' }}>Not Good (खराब)</option>
                    <option value="Normal" style={{ backgroundColor: '#1c1c20', color: '#fbbf24' }}>Normal (नॉर्मल)</option>
                    <option value="Good" style={{ backgroundColor: '#1c1c20', color: '#60a5fa' }}>Good (छान)</option>
                    <option value="Perfect" style={{ backgroundColor: '#1c1c20', color: '#34d399' }}>Perfect (उत्तम)</option>
                  </select>
                </div>

                {/* Taal Theke */}
                <div>
                  <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">🎵 Taal Theke (ताल ठेके)</label>
                  <select
                    value={examAttitude}
                    onChange={e => setExamAttitude(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer font-medium"
                    style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    <option value="" style={{ backgroundColor: '#1c1c20', color: '#888' }}>-- Select --</option>
                    <option value="Not Good" style={{ backgroundColor: '#1c1c20', color: '#f87171' }}>Not Good (खराब)</option>
                    <option value="Normal" style={{ backgroundColor: '#1c1c20', color: '#fbbf24' }}>Normal (नॉर्मल)</option>
                    <option value="Good" style={{ backgroundColor: '#1c1c20', color: '#60a5fa' }}>Good (छान)</option>
                    <option value="Perfect" style={{ backgroundColor: '#1c1c20', color: '#34d399' }}>Perfect (उत्तम)</option>
                  </select>
                </div>
              </div>

              {/* Overall Score Dropdown (1 to 10) */}
              <div>
                <label className="block text-[10px] text-white/60 uppercase tracking-wider mb-1.5 font-semibold">🏆 Overall Score (1 to 10)</label>
                <select
                  value={examScore}
                  onChange={e => setExamScore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer font-medium"
                  style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}
                >
                  <option value="" style={{ backgroundColor: '#1c1c20', color: '#888' }}>-- Select Score (1 to 10) --</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={String(num)} style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>
                      {num} / 10 {num >= 8 ? '⭐ Excellent' : num >= 6 ? '👍 Good' : num >= 4 ? '😐 Average' : '⚠️ Needs Practice'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1.5">📝 Examiner Notes / Remarks</label>
                <textarea value={examNotes} onChange={e => setExamNotes(e.target.value)}
                  placeholder="Write remarks about this candidate's performance, attitude, special notes..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                  style={{ backgroundColor: '#1c1c20', color: '#ffffff' }} />
              </div>

              {/* Shortlist Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <div>
                  <p className="text-sm font-semibold text-amber-300">⭐ Mark as Shortlisted</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Mark this candidate for priority selection</p>
                </div>
                <button onClick={() => setShortlisted(!shortlisted)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${shortlisted ? "bg-amber-500" : "bg-white/15"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${shortlisted ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          )}

          {/* ── CONTACT TAB ── */}
          {activeTab === "contact" && (
            <div className="space-y-1">
              <InfoRow icon="📱" label="WhatsApp Number" value={member.whatsapp} />
              <InfoRow icon="📧" label="Email Address" value={member.email} />
              <InfoRow icon="👨‍👦" label="Parent / Guardian Contact" value={member.parent_contact} />
              <InfoRow icon="🏠" label="Home Address" value={member.address} />
              <InfoRow icon="👤" label="Referred By" value={member.reference} />

              {/* Quick action buttons */}
              {member.whatsapp && (
                <div className="space-y-2.5 mt-4 pt-4 border-t border-white/8">
                  <button
                    type="button"
                    onClick={sendAutoWhatsApp}
                    disabled={sendingWa}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    🤖 {sendingWa ? "Sending WhatsApp..." : "Send Auto WhatsApp Result"}
                  </button>
                  {waStatusMsg && (
                    <p className="text-xs text-emerald-400 text-center font-medium animate-rise">{waStatusMsg}</p>
                  )}
                  <div className="flex gap-3">
                    <a href={`https://wa.me/91${member.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-semibold hover:bg-white/10 transition-all">
                      💬 Manual WhatsApp
                    </a>
                    <a href={`tel:${member.whatsapp}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all">
                      📞 Call
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-white/8 shrink-0 space-y-2">
          {/* WhatsApp Status Banner */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
            waServerOk === true ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            waServerOk === false ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-white/5 text-white/30 border border-white/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              waServerOk === true ? 'bg-emerald-400 animate-pulse' :
              waServerOk === false ? 'bg-amber-400' : 'bg-white/30'
            }`} />
            {waServerOk === true
              ? '🤖 WhatsApp Server: Connected — Auto messages ready!'
              : waServerOk === false
              ? '⚠️ WhatsApp Server: Offline — Run "npm run whatsapp" in a new terminal'
              : '🔄 Checking WhatsApp server...'}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all">
              Close
            </button>
            {member.whatsapp && (
              <button
                type="button"
                onClick={sendAutoWhatsApp}
                disabled={sendingWa}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {sendingWa ? '🤖 Sending...' : '🤖 Send WhatsApp'}
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold hover:from-red-500 hover:to-red-600 disabled:opacity-40 transition-all shadow-lg shadow-red-900/30">
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
          {waStatusMsg && (
            <p className="text-xs text-center font-medium text-emerald-400">{waStatusMsg}</p>
          )}
        </div>
      </div>
    </div>
  , document.body);
}

/* ─── Skeleton ─────────────────────────────────────── */
const Skeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-32 rounded-2xl bg-white/5" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5" />)}
    </div>
    <div className="h-96 rounded-2xl bg-white/5" />
  </div>
);

/* ─── Main Component ───────────────────────────────── */
export default function NewMemberExam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailMember, setDetailMember] = useState(null);
  const [search, setSearch] = useState("");
  const [filterInst, setFilterInst] = useState("all");
  const [filterExp, setFilterExp] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [filterShortlist, setFilterShortlist] = useState("all");

  const loadData = useCallback(async () => {
    const { data, error } = await supabase.from("new_members").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      setMembers(data);
    } else {
      setMembers(LOCAL_MEMBERS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel("new-members-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "new_members" }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const updateExam = async (id, fields) => {
    const { error } = await supabase.from("new_members").update(fields).eq("id", id);
    if (error) console.warn("Update failed:", error.message);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
    setDetailMember(null);
  };

  if (loading) return <Skeleton />;

  const total = members.length;
  const dholCount = members.filter(m => (m.instruments_played || "").includes("ढोल")).length;
  const tashaCount = members.filter(m => (m.instruments_played || "").includes("ताशा")).length;
  const fresherCount = members.filter(m => (m.experience || "").includes("Fresher")).length;
  const passed = members.filter(m => m.exam_status === "passed").length;
  const failed = members.filter(m => m.exam_status === "failed").length;
  const pending = members.filter(m => !m.exam_status || m.exam_status === "pending").length;
  const shortlisted = members.filter(m => m.shortlisted).length;

  const filtered = members.filter(m => {
    if (filterInst !== "all" && !(m.instruments_played || "").includes(filterInst)) return false;
    if (filterExp !== "all" && m.experience !== filterExp) return false;
    if (filterExam !== "all" && (m.exam_status || "pending") !== filterExam) return false;
    if (filterShortlist === "yes" && !m.shortlisted) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return ["full_name", "email", "whatsapp", "address", "previous_pathak", "instruments_played", "reference", "profession", "hobbies"].some(k =>
      (m[k] || "").toLowerCase().includes(q)
    );
  });

  const statusBadge = (status, shortlisted) => {
    const map = {
      passed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      failed: "bg-red-500/15 text-red-400 border-red-500/25",
      pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    };
    const label = { passed: "Passed", failed: "Failed", pending: "Pending" };
    const s = status || "pending";
    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[s]}`}>{label[s]}</span>
        {shortlisted && <span className="text-[9px] text-amber-400">⭐ Shortlisted</span>}
      </div>
    );
  };

  return (
    <Fragment>
    <div className="space-y-6 animate-rise">

      {/* ── HEADER BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a0505] via-[#120303] to-[#0d0d10] border border-white/8">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">Live · गणेशोत्सव २०२६</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                नवीन सदस्य परीक्षा
                <span className="text-red-400 ml-2 font-light">· New Member Exam</span>
              </h1>
              <p className="text-white/45 text-sm mt-1.5">ताल वाद्यपथक, पुणे — {total} registered applicants</p>
            </div>

            {/* Action Buttons & Progress */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => downloadNewMemberExamPDF(filtered, filterExam !== "all" ? `${filterExam.toUpperCase()} Candidates` : "Filtered Candidates")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-semibold hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
                PDF Report ({filtered.length})
              </button>

              <button
                onClick={() => downloadCSV(filtered, `TAAL_Exam_Results_${filterExam}_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                📊 Excel / CSV ({filtered.length})
              </button>

              {/* Progress bar */}
              <div className="sm:w-44 bg-white/4 p-2.5 rounded-xl border border-white/8">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Evaluated</span>
                  <span className="font-bold text-white">{total > 0 ? Math.round(((passed + failed) / total) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-emerald-400 rounded-full transition-all" style={{ width: `${total > 0 ? ((passed + failed) / total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS GRID & QUICK STATUS TABS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "All Applicants", value: total, emoji: "👥", color: "text-white", filterKey: "all" },
          { label: "Dhol Players", value: dholCount, emoji: "🥁", color: "text-red-400", filterInstKey: "ढोल" },
          { label: "Tasha Players", value: tashaCount, emoji: "🎵", color: "text-sky-400", filterInstKey: "ताशा" },
          { label: "Freshers", value: fresherCount, emoji: "🌱", color: "text-emerald-400", filterExpKey: "Fresher" },
          { label: "Passed (✅)", value: passed, emoji: "✅", color: "text-emerald-400", filterExamKey: "passed" },
          { label: "Failed (❌)", value: failed, emoji: "❌", color: "text-red-400", filterExamKey: "failed" },
          { label: "Shortlisted", value: shortlisted, emoji: "⭐", color: "text-amber-400", filterShortlistKey: "yes" },
        ].map(s => {
          const isActive =
            (s.filterKey && filterExam === "all" && filterInst === "all" && filterExp === "all" && filterShortlist === "all") ||
            (s.filterExamKey && filterExam === s.filterExamKey) ||
            (s.filterInstKey && filterInst === s.filterInstKey) ||
            (s.filterExpKey && filterExp === s.filterExpKey) ||
            (s.filterShortlistKey && filterShortlist === "yes");

          return (
            <button
              key={s.label}
              onClick={() => {
                if (s.filterExamKey) setFilterExam(s.filterExamKey);
                else if (s.filterInstKey) setFilterInst(s.filterInstKey);
                else if (s.filterExpKey) setFilterExp(s.filterExpKey);
                else if (s.filterShortlistKey) setFilterShortlist("yes");
                else { setFilterExam("all"); setFilterInst("all"); setFilterExp("all"); setFilterShortlist("all"); }
              }}
              className={`group rounded-2xl border transition-all duration-200 text-center p-3.5 ${
                isActive
                  ? "bg-white/10 border-red-500/60 shadow-lg shadow-red-950/40"
                  : "bg-white/4 border-white/8 hover:border-white/20 hover:-translate-y-0.5"
              }`}
            >
              <p className="text-xl mb-1">{s.emoji}</p>
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5 font-medium">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, instrument, reference, profession..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 transition-all" style={{ background: '#1c1c20' }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs">✕</button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Instrument */}
          <select value={filterInst} onChange={e => setFilterInst(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-white/20 text-xs text-white font-semibold focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}>
            <option value="all" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>🎵 All Instruments</option>
            <option value="ढोल" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>🥁 ढोल</option>
            <option value="ताशा" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>🎵 ताशा</option>
            <option value="कोणतेच नाही" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>🆕 None</option>
          </select>

          {/* Experience */}
          <select value={filterExp} onChange={e => setFilterExp(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-white/20 text-xs text-white font-semibold focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}>
            <option value="all" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>⏱ All Experience</option>
            {EXPERIENCE_LEVELS.map(l => <option key={l} value={l} style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>{l}</option>)}
          </select>

          {/* Exam Status */}
          <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-white/20 text-xs text-white font-semibold focus:outline-none focus:border-red-500 transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: '#1c1c20', color: '#ffffff', colorScheme: 'dark' }}>
            <option value="all" style={{ backgroundColor: '#1c1c20', color: '#ffffff' }}>📝 All Exam Status</option>
            <option value="pending" style={{ backgroundColor: '#1c1c20', color: '#fbbf24' }}>⏳ Pending</option>
            <option value="passed" style={{ backgroundColor: '#1c1c20', color: '#34d399' }}>✅ Passed</option>
            <option value="failed" style={{ backgroundColor: '#1c1c20', color: '#f87171' }}>❌ Failed</option>
          </select>

          {/* Shortlisted */}
          <button onClick={() => setFilterShortlist(v => v === "yes" ? "all" : "yes")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              filterShortlist === "yes"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                : "bg-white/5 border-white/10 text-white/70 hover:text-white"
            }`}>
            ⭐ Shortlisted Only
          </button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <p className="text-xs text-white/40">Showing <span className="text-white font-semibold">{filtered.length}</span> of {total} members</p>
          <p className="text-[10px] text-white/25">Click any row for full details</p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-white/50 text-sm font-medium">No members found</p>
            <p className="text-white/25 text-xs mt-1">Try different filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/6">
                  {[
                    { label: "Member", className: "pl-5 pr-4 py-3 w-52" },
                    { label: "Contact", className: "px-4 py-3 hidden sm:table-cell" },
                    { label: "Instrument", className: "px-4 py-3 text-center" },
                    { label: "Experience", className: "px-4 py-3 text-center hidden md:table-cell" },
                    { label: "Prev. Pathak", className: "px-4 py-3 hidden lg:table-cell" },
                    { label: "Batch", className: "px-4 py-3 text-center hidden xl:table-cell" },
                    { label: "Exam", className: "px-4 py-3 text-center" },
                    { label: "", className: "px-4 py-3 w-8" },
                  ].map(({ label, className }) => (
                    <th key={label} className={`text-[10px] font-semibold text-white/30 uppercase tracking-wider ${className}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(m => (
                  <tr key={m.id} onClick={() => setDetailMember(m)}
                    className="hover:bg-white/4 cursor-pointer transition-colors group">

                    {/* Member */}
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(m.full_name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                          {getInitials(m.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm leading-tight">{m.full_name}</p>
                          <p className="text-[10px] text-white/35 mt-0.5">{calcAge(m.dob)} yrs · {m.gender}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-sm text-white/75">{m.whatsapp || "—"}</p>
                      {m.email && <p className="text-[10px] text-white/35 truncate max-w-[160px]">{m.email}</p>}
                    </td>

                    {/* Instrument */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        (m.instruments_played || "").includes("ढोल") ? "bg-red-500/15 text-red-400" :
                        (m.instruments_played || "").includes("ताशा") ? "bg-sky-500/15 text-sky-400" :
                        "bg-white/8 text-white/40"
                      }`}>
                        {(m.instruments_played || "—").replace("कोणतेच नाही", "None")}
                      </span>
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      <span className="text-xs text-white/45">
                        {(m.experience || "—").split(" (")[0]}
                      </span>
                    </td>

                    {/* Prev. Pathak */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-white/40 truncate max-w-[140px] block">{m.previous_pathak || "—"}</span>
                    </td>

                    {/* Batch */}
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      {m.batch_assigned
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">{m.batch_assigned}</span>
                        : <span className="text-[10px] text-white/20">Not assigned</span>
                      }
                    </td>

                    {/* Exam Status */}
                    <td className="px-4 py-3.5 text-center">
                      {statusBadge(m.exam_status, m.shortlisted)}
                    </td>

                    {/* Chevron */}
                    <td className="px-4 py-3.5 text-center">
                      <svg className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {detailMember && (
        <DetailModal
          member={detailMember}
          onClose={() => setDetailMember(null)}
          onExamUpdate={updateExam}
        />
      )}
      </div>
    </Fragment>
  );
}
