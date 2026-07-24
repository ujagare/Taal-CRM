import { useCallback, useEffect, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

/* ═══════ Constants & Helpers ═══════ */
const INITIAL_BATCHES = [
  { id: "b2026", name: "2026 Batch", year: 2026, course: "Dhol Tasha Master Training", trainer_name: "Nikhil Modi" },
  { id: "b2025", name: "2025 Batch", year: 2025, course: "Advanced Rhythm & Tasha", trainer_name: "Sanket Dada" },
  { id: "b2024", name: "2024 Batch", year: 2024, course: "Tasha Beats & Dhwaj", trainer_name: "Rahul Pathak" },
  { id: "b2023", name: "2023 Batch", year: 2023, course: "Basic Dhol Foundation", trainer_name: "Shrohit Kalambkar" },
  { id: "b2022", name: "2022 Batch", year: 2022, course: "Dhol Tasha Foundation", trainer_name: "Nikhil Modi" },
  { id: "b2021", name: "2021 Batch", year: 2021, course: "Traditional Pathak Rhythms", trainer_name: "Sanket Dada" },
  { id: "b2020", name: "2020 Batch", year: 2020, course: "Dhol Tasha Foundation", trainer_name: "Rahul Pathak" },
  { id: "b2019", name: "2019 Batch", year: 2019, course: "Senior Cadre Training", trainer_name: "Nikhil Modi" },
  { id: "b2018", name: "2018 Batch", year: 2018, course: "Dhol Tasha Master", trainer_name: "Shrohit Kalambkar" },
  { id: "b2017", name: "2017 Batch", year: 2017, course: "Advanced Rhythm", trainer_name: "Sanket Dada" },
  { id: "b2016", name: "2016 Batch", year: 2016, course: "Foundation", trainer_name: "Rahul Pathak" },
  { id: "b2015", name: "2015 Batch", year: 2015, course: "Foundation", trainer_name: "Nikhil Modi" },
  { id: "b2014", name: "2014 Batch", year: 2014, course: "Foundation", trainer_name: "Sanket Dada" },
  { id: "b2013", name: "2013 Batch", year: 2013, course: "Foundation", trainer_name: "Rahul Pathak" },
  { id: "b2012", name: "2012 Batch", year: 2012, course: "Foundation", trainer_name: "Shrohit Kalambkar" },
  { id: "b2011", name: "2011 Batch", year: 2011, course: "Foundation", trainer_name: "Nikhil Modi" },
  { id: "b2010", name: "2010 Batch", year: 2010, course: "Founding Pathak Cadre", trainer_name: "Nikhil Modi" }
];

const LOCAL_KEY_ATTENDANCE = "taal_attendance_records_v1";
const LOCAL_KEY_BATCHES = "taal_batches_master_v1";
const LOCAL_KEY_STUDENTS = "taal_students_master_v1";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function parseTimeToMinutes(tStr) {
  if (!tStr) return 0;
  const clean = tStr.trim();
  let [time, modifier] = clean.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (modifier) {
    if (modifier.toUpperCase() === "PM" && h < 12) h += 12;
    if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
  }
  return h * 60 + (m || 0);
}

function calcTotalMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const inMin = parseTimeToMinutes(checkIn);
  const outMin = parseTimeToMinutes(checkOut);
  if (outMin < inMin) return 0;
  return outMin - inMin;
}

function fmtMinutesToHours(mins) {
  if (!mins || mins <= 0) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/* ═══════ Default Seed Data ═══════ */
const DEFAULT_STUDENTS = [
  { id: "s1", roll_number: "TP-001", name: "Rohit Shinde", phone: "9822322901", batch_name: "2026 Batch", course: "Dhol Tasha Master", status: "Active" },
  { id: "s2", roll_number: "TP-002", name: "Sunny Kalambkar", phone: "8007092121", batch_name: "2026 Batch", course: "Dhol Tasha Master", status: "Active" },
  { id: "s3", roll_number: "TP-003", name: "Rahul Modi", phone: "9822001122", batch_name: "2026 Batch", course: "Dhol Tasha Master", status: "Active" },
  { id: "s4", roll_number: "TP-004", name: "Aniket Pawar", phone: "9876543210", batch_name: "2025 Batch", course: "Advanced Rhythm", status: "Active" },
  { id: "s5", roll_number: "TP-005", name: "Sanket Kulkarni", phone: "9123456789", batch_name: "2025 Batch", course: "Advanced Rhythm", status: "Active" },
  { id: "s6", roll_number: "TP-006", name: "Pranav Joshi", phone: "9988776655", batch_name: "2024 Batch", course: "Tasha Beats", status: "Active" },
  { id: "s7", roll_number: "TP-007", name: "Omkar Deshmukh", phone: "9456123789", batch_name: "2026 Batch", course: "Dhol Tasha Master", status: "Active" },
  { id: "s8", roll_number: "TP-008", name: "Aditya Bhosale", phone: "9321654987", batch_name: "2026 Batch", course: "Dhol Tasha Master", status: "Active" },
];

const DEFAULT_ATTENDANCE = [
  { id: "a1", student_id: "s1", student_name: "Rohit Shinde", roll_number: "TP-001", batch_name: "2026 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: "09:05:00", check_out: "17:30:00", total_minutes: 505, status: "Present", device_name: "Secureye S-FB5K", is_biometric: true },
  { id: "a2", student_id: "s2", student_name: "Sunny Kalambkar", roll_number: "TP-002", batch_name: "2026 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: "09:12:00", check_out: "17:15:00", total_minutes: 483, status: "Late", device_name: "Secureye S-FB5K", is_biometric: true },
  { id: "a3", student_id: "s3", student_name: "Rahul Modi", roll_number: "TP-003", batch_name: "2026 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: "08:58:00", check_out: "17:45:00", total_minutes: 527, status: "Present", device_name: "Secureye S-FB5K", is_biometric: true },
  { id: "a4", student_id: "s4", student_name: "Aniket Pawar", roll_number: "TP-004", batch_name: "2025 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: "09:00:00", check_out: "17:00:00", total_minutes: 480, status: "Present", device_name: "Secureye S-FB5K", is_biometric: true },
  { id: "a5", student_id: "s5", student_name: "Sanket Kulkarni", roll_number: "TP-005", batch_name: "2025 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: "09:30:00", check_out: "13:30:00", total_minutes: 240, status: "Half Day", device_name: "Secureye S-FB5K", is_biometric: true },
  { id: "a6", student_id: "s6", student_name: "Pranav Joshi", roll_number: "TP-006", batch_name: "2024 Batch", attendance_date: new Date().toISOString().slice(0, 10), check_in: null, check_out: null, total_minutes: 0, status: "Absent", device_name: "—", is_biometric: false },
];

const DEFAULT_DEVICES = [
  { id: "dev_sfb5k", name: "Secureye S-FB5K (Face & Fingerprint)", brand: "Secureye", model: "S-FB5K", serial: "02379B92D13", ip: "192.168.1.150", location: "TAAL Pathak Main Gate", status: "Online", lastSync: "Auto-Push Ready" },
  { id: "dev1", name: "ZKTeco K40 — Main Gate", brand: "ZKTeco", ip: "192.168.1.101", location: "Entrance Gate 1", status: "Online", lastSync: "Auto-Connected (Cloud)" },
  { id: "dev2", name: "eSSL Silk100 — Practice Hall", brand: "eSSL", ip: "192.168.1.102", location: "Main Hall A", status: "Online", lastSync: "Auto-Connected (Cloud)" },
];

/* ═══════ Animated Value ═══════ */
function AnimatedValue({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 800;
    const start = performance.now();
    const startVal = display;
    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}</span>;
}

/* ═══════ PDF Download Function ═══════ */
async function downloadAttendancePDF(records, batchFilter, dateRangeLabel) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:0;top:99999px;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;visibility:visible;display:block;";

  const presentCount = records.filter(r => r.status === "Present").length;
  const totalHoursStr = fmtMinutesToHours(records.reduce((acc, r) => acc + (r.total_minutes || 0), 0));

  container.innerHTML = `
    <div>
      <div style="text-align:center;margin-bottom:24px;">
        <img src="/taal-pathak-logo-red.png" style="height:70px;width:auto;margin:0 auto 10px;display:block;" />
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">TAAL Pathak — Attendance Report</h1>
        <p style="margin:4px 0 0;font-size:12.5px;color:#6B7280;">Batch: <strong>${batchFilter || "All Batches"}</strong> | Period: ${dateRangeLabel || "All Dates"} (${timeStr})</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;">Total Records</div>
          <div style="font-size:28px;font-weight:700;color:#111827;margin-top:4px;">${records.length}</div>
        </div>
        <div style="background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:11px;color:#047857;font-weight:600;text-transform:uppercase;">Present Count</div>
          <div style="font-size:28px;font-weight:700;color:#047857;margin-top:4px;">${presentCount}</div>
        </div>
        <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:11px;color:#DC2626;font-weight:600;text-transform:uppercase;">Completed Working Hours</div>
          <div style="font-size:26px;font-weight:700;color:#DC2626;margin-top:4px;">${totalHoursStr}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E5E7EB;">
        <thead>
          <tr style="background:#111827;color:#FFF;">
            <th style="padding:10px;text-align:center;width:35px;">#</th>
            <th style="padding:10px;text-align:left;">Student Name</th>
            <th style="padding:10px;text-align:center;">Roll No</th>
            <th style="padding:10px;text-align:center;">Batch</th>
            <th style="padding:10px;text-align:center;">Date</th>
            <th style="padding:10px;text-align:center;">Check In</th>
            <th style="padding:10px;text-align:center;">Check Out</th>
            <th style="padding:10px;text-align:center;">Total Hours</th>
            <th style="padding:10px;text-align:center;">Verification</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => `
            <tr style="background:#FFF;border-bottom:1px solid #E5E7EB;">
              <td style="padding:9px;text-align:center;color:#6B7280;">${i + 1}</td>
              <td style="padding:9px;text-align:left;font-weight:600;color:#111827;">${r.student_name}</td>
              <td style="padding:9px;text-align:center;font-family:monospace;">${r.roll_number || "—"}</td>
              <td style="padding:9px;text-align:center;">${r.batch_name}</td>
              <td style="padding:9px;text-align:center;color:#4B5563;">${fmtDate(r.attendance_date)}</td>
              <td style="padding:9px;text-align:center;color:#047857;font-weight:600;">${r.check_in || "—"}</td>
              <td style="padding:9px;text-align:center;color:#DC2626;font-weight:600;">${r.check_out || "—"}</td>
              <td style="padding:9px;text-align:center;font-weight:700;">${fmtMinutesToHours(r.total_minutes)}</td>
              <td style="padding:9px;text-align:center;font-weight:600;color:${r.is_biometric ? "#047857" : "#6B7280"};">
                ${r.is_biometric ? "🔒 Biometric Verified" : "Manual CRM"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10.5px;color:#9CA3AF;">
        <div>TAAL Pathak Operations CRM — Isolated Batch Report</div>
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

    pdf.save(`TAAL_${(batchFilter || "All_Batches").replace(/\s+/g, "_")}_Attendance.pdf`);
  } catch (err) {
    console.error("PDF generation error:", err);
  } finally {
    document.body.removeChild(container);
  }
}

/* ═══════ CSV Download Function ═══════ */
function downloadCSV(records, batchName = "All_Batches") {
  const headers = ["Student Name", "Roll Number", "Batch", "Date", "Check In", "Check Out", "Total Minutes", "Total Hours", "Status", "Biometric Lock", "Device"];
  const rows = records.map(r => [
    `"${r.student_name}"`,
    `"${r.roll_number || ""}"`,
    `"${r.batch_name}"`,
    `"${r.attendance_date}"`,
    `"${r.check_in || ""}"`,
    `"${r.check_out || ""}"`,
    r.total_minutes || 0,
    `"${fmtMinutesToHours(r.total_minutes)}"`,
    `"${r.status}"`,
    `"${r.is_biometric ? "LOCKED (Biometric Verified)" : "Manual Entry"}"`,
    `"${r.device_name || ""}"`
  ]);

  const csvText = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `TAAL_${batchName.replace(/\s+/g, "_")}_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — AttendanceManager
   ═══════════════════════════════════════════════════ */
export default function AttendanceManager() {
  const [batches, setBatches] = useState(INITIAL_BATCHES);
  const [students, setStudents] = useState(DEFAULT_STUDENTS);
  const [attendance, setAttendance] = useState(DEFAULT_ATTENDANCE);
  const LOCAL_KEY_DEVICES = "taal_devices_master_v2";

  const [devices, setDevices] = useState(() => {
    try {
      const saved = localStorage.getItem("taal_devices_master_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.some(d => d.brand === "Secureye" || d.model === "S-FB5K")) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_DEVICES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("taal_devices_master_v2", JSON.stringify(devices));
    } catch { /* ignore */ }
  }, [devices]);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filters (Batch, Status, Search)
  const [batchFilter, setBatchFilter] = useState("All Batches");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Date Range Filters (Date-wise, Day-wise & Custom Range)
  const [dateRangePreset, setDateRangePreset] = useState("All Dates");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Biometric Direct Auto-Connect Switch
  const [autoConnectListener] = useState(true);
  const [showDeviceSetupModal, setShowDeviceSetupModal] = useState(false);

  // Modals
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markStudent, setMarkStudent] = useState("");
  const [markInTime, setMarkInTime] = useState("09:00");
  const [markOutTime, setMarkOutTime] = useState("17:30");
  const [markStatus, setMarkStatus] = useState("Present");

  // New Batch Modal State
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchYear, setNewBatchYear] = useState("2026");
  const [newBatchCourse, setNewBatchCourse] = useState("Dhol Tasha Master Training");
  const [newBatchTrainer, setNewBatchTrainer] = useState("");

  // New Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStdName, setNewStdName] = useState("");
  const [newStdRoll, setNewStdRoll] = useState("");
  const [newStdPhone, setNewStdPhone] = useState("");
  const [newStdBatch, setNewStdBatch] = useState("2026 Batch");
  const [newStdCourse, setNewStdCourse] = useState("Dhol Tasha Master");

  // Sync animation state
  const [syncing, setSyncing] = useState(false);

  // Load from LocalStorage + Supabase
  const loadData = useCallback(async () => {
    try {
      const savedAtt = localStorage.getItem(LOCAL_KEY_ATTENDANCE);
      if (savedAtt) setAttendance(JSON.parse(savedAtt));

      const savedBatches = localStorage.getItem(LOCAL_KEY_BATCHES);
      if (savedBatches) setBatches(JSON.parse(savedBatches));

      const savedStudents = localStorage.getItem(LOCAL_KEY_STUDENTS);
      if (savedStudents) setStudents(JSON.parse(savedStudents));

      const [dbAttRes, dbBatchesRes, dbStudentsRes] = await Promise.all([
        supabase.from("attendance").select("*").order("created_at", { ascending: false }),
        supabase.from("batches").select("*").order("year", { ascending: false }),
        supabase.from("students").select("*").order("roll_number"),
      ]);

      if (Array.isArray(dbAttRes.data) && dbAttRes.data.length > 0) setAttendance(dbAttRes.data);
      if (Array.isArray(dbBatchesRes.data) && dbBatchesRes.data.length > 0) setBatches(dbBatchesRes.data);
      if (Array.isArray(dbStudentsRes.data) && dbStudentsRes.data.length > 0) setStudents(dbStudentsRes.data);

    } catch {
      /* Fallback */
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY_ATTENDANCE, JSON.stringify(attendance));
      localStorage.setItem(LOCAL_KEY_BATCHES, JSON.stringify(batches));
      localStorage.setItem(LOCAL_KEY_STUDENTS, JSON.stringify(students));
    } catch { /* ignore */ }
  }, [attendance, batches, students]);

  /* ─── Add New Batch Handler ─── */
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    const bName = newBatchName.trim().includes("Batch") ? newBatchName.trim() : `${newBatchName.trim()} Batch`;
    const newB = {
      id: Date.now().toString(),
      name: bName,
      year: Number(newBatchYear) || 2026,
      course: newBatchCourse.trim() || "Dhol Tasha Training",
      trainer_name: newBatchTrainer.trim() || "TAAL Instructor",
    };

    setBatches(prev => [newB, ...prev]);

    try {
      await supabase.from("batches").insert({
        name: newB.name,
        year: newB.year,
        course: newB.course,
        trainer_name: newB.trainer_name,
      });
    } catch { /* ignore */ }

    setNewBatchName("");
    setNewBatchTrainer("");
    setShowAddBatchModal(false);
  };

  /* ─── Add New Student Handler ─── */
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStdName.trim() || !newStdRoll.trim()) return;

    const newS = {
      id: Date.now().toString(),
      roll_number: newStdRoll.trim(),
      name: newStdName.trim(),
      phone: newStdPhone.trim() || "—",
      batch_name: newStdBatch,
      course: newStdCourse.trim() || "Dhol Tasha Master",
      status: "Active",
    };

    setStudents(prev => [...prev, newS]);

    try {
      await supabase.from("students").insert({
        roll_number: newS.roll_number,
        name: newS.name,
        phone: newS.phone,
        batch_name: newS.batch_name,
        course: newS.course,
        status: "Active",
      });
    } catch { /* ignore */ }

    setNewStdName("");
    setNewStdRoll("");
    setNewStdPhone("");
    setShowAddStudentModal(false);
  };

  /* ─── Date Range Filter Computation ─── */
  const dateRangeTextLabel = useMemo(() => {
    if (dateRangePreset === "Today") return `Today (${new Date().toLocaleDateString("en-IN")})`;
    if (dateRangePreset === "Yesterday") return "Yesterday";
    if (dateRangePreset === "This Week") return "Last 7 Days (This Week)";
    if (dateRangePreset === "This Month") return "This Month";
    if (dateRangePreset === "Custom Range" && startDate && endDate) return `${fmtDate(startDate)} to ${fmtDate(endDate)}`;
    return "All Dates";
  }, [dateRangePreset, startDate, endDate]);

  /* ─── Filtered Attendance Data ─── */
  const filteredAttendance = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().slice(0, 10);

    return attendance.filter(r => {
      if (batchFilter !== "All Batches" && r.batch_name !== batchFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.student_name.toLowerCase().includes(q);
        const matchRoll = (r.roll_number || "").toLowerCase().includes(q);
        if (!matchName && !matchRoll) return false;
      }
      if (dateRangePreset === "Today" && r.attendance_date !== todayStr) return false;
      if (dateRangePreset === "Yesterday" && r.attendance_date !== yesterdayStr) return false;
      if (dateRangePreset === "This Week" && r.attendance_date < sevenDaysAgoStr) return false;
      if (dateRangePreset === "This Month" && !r.attendance_date.startsWith(todayStr.slice(0, 7))) return false;
      if (dateRangePreset === "Custom Range") {
        if (startDate && r.attendance_date < startDate) return false;
        if (endDate && r.attendance_date > endDate) return false;
      }
      return true;
    });
  }, [attendance, batchFilter, statusFilter, searchQuery, dateRangePreset, startDate, endDate]);

  /* ─── Rankings Computation (🥇 🥈 🥉) ─── */
  const studentRankings = useMemo(() => {
    const map = {};

    students.forEach(s => {
      map[s.id] = { ...s, totalMins: 0, presentDays: 0, lateCount: 0 };
    });

    attendance.forEach(r => {
      if (map[r.student_id]) {
        map[r.student_id].totalMins += r.total_minutes || 0;
        if (r.status === "Present" || r.status === "Late" || r.status === "Half Day") {
          map[r.student_id].presentDays += 1;
        }
        if (r.status === "Late") {
          map[r.student_id].lateCount += 1;
        }
      } else {
        map[r.student_id] = {
          id: r.student_id,
          name: r.student_name,
          roll_number: r.roll_number || "TP-000",
          batch_name: r.batch_name,
          totalMins: r.total_minutes || 0,
          presentDays: 1,
          lateCount: r.status === "Late" ? 1 : 0,
        };
      }
    });

    let list = Object.values(map);
    if (batchFilter !== "All Batches") {
      list = list.filter(s => s.batch_name === batchFilter);
    }

    list.sort((a, b) => b.totalMins - a.totalMins);

    return list;
  }, [students, attendance, batchFilter]);

  /* ─── Stats Overview ─── */
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(r => r.status === "Present").length;
    const late = filteredAttendance.filter(r => r.status === "Late").length;
    const halfDay = filteredAttendance.filter(r => r.status === "Half Day").length;
    const absent = filteredAttendance.filter(r => r.status === "Absent").length;
    const totalMins = filteredAttendance.reduce((sum, r) => sum + (r.total_minutes || 0), 0);
    const avgMins = total > 0 ? Math.round(totalMins / total) : 0;

    return { total, present, late, halfDay, absent, totalMins, avgMins };
  }, [filteredAttendance]);

  /* ─── Manual Check-In/Out Submit ─── */
  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    if (!markStudent) return;

    const selectedStd = students.find(s => s.name === markStudent) || { id: "custom", roll_number: "TP-999", batch_name: batchFilter !== "All Batches" ? batchFilter : "2026 Batch" };
    const mins = calcTotalMinutes(markInTime, markOutTime);

    const newRecord = {
      id: Date.now().toString(),
      student_id: selectedStd.id,
      student_name: markStudent,
      roll_number: selectedStd.roll_number,
      batch_name: selectedStd.batch_name,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_in: markInTime,
      check_out: markOutTime,
      total_minutes: mins,
      status: markStatus,
      device_name: "Manual CRM Entry",
      is_biometric: false,
    };

    setAttendance(prev => [newRecord, ...prev]);

    try {
      await supabase.from("attendance").insert({
        student_name: markStudent,
        roll_number: selectedStd.roll_number,
        batch_name: selectedStd.batch_name,
        attendance_date: newRecord.attendance_date,
        check_in: markInTime,
        check_out: markOutTime,
        total_minutes: mins,
        status: markStatus,
        device_name: "Manual CRM Entry",
      });
    } catch { /* ignore */ }

    setShowMarkModal(false);
  };

  /* ─── Biometric Sync Simulation ─── */
  const triggerBiometricSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 1200);
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
                Biometric Direct Auto-Connect
              </span>
              <span
                onClick={() => setShowDeviceSetupModal(true)}
                className="rounded-full border border-emerald/25 bg-emerald/10 px-3.5 py-1 text-xs text-emerald font-medium cursor-pointer hover:bg-emerald/20 transition-all flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-emerald animate-ping" />
                {autoConnectListener ? "🔒 Biometric Data Tamper-Proof & Locked" : "Listener Paused"}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-cream">
              अटेंडन्स मॅनेजमेंट — Attendance Control
            </h1>
            <p className="mt-2 text-sm text-mist max-w-xl">
              Biometric tamper-proof attendance, isolated batch-wise reports (2010 – 2026), and working hours leaderboard.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={triggerBiometricSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/10 text-brand-300 text-sm font-semibold hover:bg-brand/20 transition-all disabled:opacity-50"
            >
              <Icon d={I.bolt} className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Biometric"}
            </button>

            <button
              onClick={() => setShowAddBatchModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gold/30 bg-gold/10 text-gold-300 text-sm font-semibold hover:bg-gold/20 transition-all"
            >
              <Icon d={I.plus} className="w-4 h-4" />
              Add New Batch
            </button>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[.1] bg-white/[.05] text-cream text-sm font-semibold hover:bg-white/[.08] transition-all"
            >
              <Icon d={I.users} className="w-4 h-4" />
              Add Student
            </button>

            <button
              onClick={() => downloadAttendancePDF(filteredAttendance, batchFilter, dateRangeTextLabel)}
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

        {/* Navigation Tabs */}
        <div className="flex border-t border-white/[.08] bg-white/[.02] overflow-x-auto scroll-thin">
          {[
            { id: "dashboard", label: "📊 Dashboard", badge: stats.total },
            { id: "batches", label: "📚 Batches Management", badge: `${batches.length} Batches` },
            { id: "leaderboard", label: "🏆 Leaderboard & Rankings", badge: "🥇 Rank 1" },
            { id: "timeline", label: "📅 Timeline & Profiles" },
            { id: "reports", label: "📑 Custom Range Reports" },
            { id: "devices", label: "📟 Biometric Devices", badge: "Auto-Connect" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                activeTab === t.id
                  ? "border-brand text-cream bg-white/[.04]"
                  : "border-transparent text-mist hover:text-cream hover:bg-white/[.02]"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand/15 text-brand-300 font-bold border border-brand/25">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════ ADVANCED FILTER BAR (Batch, Status, Date-wise, Custom Range) ═══════ */}
      <div className="card-glass p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Row 1: Batch & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-mist uppercase tracking-wider">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-ink-950 border border-white/[.1] text-xs font-semibold text-cream focus:outline-none focus:border-brand/50 transition-colors"
            >
              <option value="All Batches">All Batches (2010 – 2026)</option>
              {batches.map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
            </select>

            <span className="text-xs font-semibold text-mist uppercase tracking-wider ml-2">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-ink-950 border border-white/[.1] text-xs font-semibold text-cream focus:outline-none focus:border-brand/50 transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
            </select>

            {/* Date Preset Dropdown */}
            <span className="text-xs font-semibold text-mist uppercase tracking-wider ml-2">Date / Day:</span>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-ink-950 border border-white/[.1] text-xs font-semibold text-cream focus:outline-none focus:border-brand/50 transition-colors"
            >
              <option value="All Dates">All Dates</option>
              <option value="Today">Today (आज)</option>
              <option value="Yesterday">Yesterday (कल)</option>
              <option value="This Week">This Week (लास्ट 7 दिन)</option>
              <option value="This Month">This Month (इस महीने)</option>
              <option value="Custom Range">Custom Range (तारीख से तारीख)</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Icon d={I.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-ink-950 border border-white/[.08] text-xs text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-cream">
                <Icon d={I.x} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Custom Date Range Pickers (if Custom Range selected) */}
        {dateRangePreset === "Custom Range" && (
          <div className="pt-2 border-t border-white/[.06] flex items-center gap-3 flex-wrap animate-rise">
            <span className="text-xs text-mist font-medium">Select Custom Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-mist">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-ink-950 border border-white/[.1] text-xs text-cream focus:outline-none focus:border-brand/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-mist">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-ink-950 border border-white/[.1] text-xs text-cream focus:outline-none focus:border-brand/50"
              />
            </div>
            <button
              onClick={() => downloadAttendancePDF(filteredAttendance, batchFilter, dateRangeTextLabel)}
              className="px-4 py-1.5 rounded-lg bg-brand/15 text-brand-300 border border-brand/25 text-xs font-semibold hover:bg-brand/25 transition-all ml-auto"
            >
              📥 Download Selected Range PDF
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB 1: DASHBOARD OVERVIEW
         ═══════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-premium relative min-h-[120px] p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-mist">Present Records</p>
                  <p className="mt-2 font-display text-3xl font-bold text-emerald tabular-nums"><AnimatedValue value={stats.present} /></p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald/10 text-emerald">
                  <Icon d={I.check} className="w-5 h-5" />
                </span>
              </div>
              <p className="mt-2 text-xs text-mist font-medium">Filter: {dateRangeTextLabel}</p>
            </div>

            <div className="card-premium relative min-h-[120px] p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-mist">Late Entries</p>
                  <p className="mt-2 font-display text-3xl font-bold text-gold-300 tabular-nums"><AnimatedValue value={stats.late} /></p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 text-gold-300">
                  <Icon d={I.calendar} className="w-5 h-5" />
                </span>
              </div>
              <p className="mt-2 text-xs text-mist font-medium">Checked in late</p>
            </div>

            <div className="card-premium relative min-h-[120px] p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-mist">Absent Count</p>
                  <p className="mt-2 font-display text-3xl font-bold text-brand-300 tabular-nums"><AnimatedValue value={stats.absent} /></p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand-300">
                  <Icon d={I.trash} className="w-5 h-5" />
                </span>
              </div>
              <p className="mt-2 text-xs text-mist font-medium">No Check In recorded</p>
            </div>

            <div className="card-premium relative min-h-[120px] p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-mist">Total Working Hours</p>
                  <p className="mt-2 font-display text-2xl font-bold text-cream tabular-nums">{fmtMinutesToHours(stats.totalMins)}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-gold-300">
                  <Icon d={I.briefcase} className="w-5 h-5" />
                </span>
              </div>
              <p className="mt-2 text-xs text-mist font-medium">Avg: {fmtMinutesToHours(stats.avgMins)} / student</p>
            </div>
          </div>

          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-cream">Attendance Records ({dateRangeTextLabel})</h3>
                <p className="text-xs text-mist">Biometric records are locked and tamper-proof</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadCSV(filteredAttendance, batchFilter)} className="px-3 py-1.5 rounded-lg border border-white/[.1] bg-white/[.04] text-xs font-semibold text-cream hover:bg-white/[.08]">
                  Export CSV
                </button>
                <button onClick={() => downloadAttendancePDF(filteredAttendance, batchFilter, dateRangeTextLabel)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-xs font-semibold hover:shadow-lg">
                  Download PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[.08] text-mist font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Roll No</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Check In</th>
                    <th className="py-3 px-3">Check Out</th>
                    <th className="py-3 px-3">Total Working Hours</th>
                    <th className="py-3 px-3">Verification / Security</th>
                    <th className="py-3 px-3">Device Machine</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map(r => (
                    <tr key={r.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                      <td className="py-3 px-3 font-semibold text-cream">{r.student_name}</td>
                      <td className="py-3 px-3 font-mono text-mist">{r.roll_number || "—"}</td>
                      <td className="py-3 px-3 text-cream">{r.batch_name}</td>
                      <td className="py-3 px-3 text-mist">{fmtDate(r.attendance_date)}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald">{r.check_in || "—"}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-brand-300">{r.check_out || "—"}</td>
                      <td className="py-3 px-3 font-bold text-cream">{fmtMinutesToHours(r.total_minutes)}</td>
                      <td className="py-3 px-3">
                        {r.is_biometric !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald/15 text-emerald border border-emerald/30">
                            🔒 Biometric Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[.05] text-mist border border-white/[.08]">
                            Manual CRM
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-mist text-[11px]">{r.device_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 2: BATCHES MANAGEMENT (WITH ISOLATED DOWNLOADS)
         ═══════════════════════════════════════════════════ */}
      {activeTab === "batches" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-cream">📚 Isolated Batch Management System (2010 – 2026)</h2>
              <p className="text-xs text-mist mt-0.5">Download separate attendance data for each individual batch without mixing.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-4 py-2 rounded-xl bg-white/[.05] border border-white/[.1] text-cream text-xs font-semibold hover:bg-white/[.08] transition-all"
              >
                + Add Student to Batch
              </button>
              <button
                onClick={() => setShowAddBatchModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-xs font-semibold hover:shadow-lg transition-all"
              >
                + Create New Batch
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map(b => {
              const enrolledStudents = students.filter(s => s.batch_name === b.name);
              const batchAtt = attendance.filter(a => a.batch_name === b.name);
              const batchMins = batchAtt.reduce((sum, a) => sum + (a.total_minutes || 0), 0);

              return (
                <div key={b.id || b.name} className="card-premium p-5 space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand/15 text-brand-300 border border-brand/25">
                        Year {b.year}
                      </span>
                      <h3 className="font-display text-2xl font-bold text-cream mt-2">{b.name}</h3>
                      <p className="text-xs text-mist mt-0.5">{b.course}</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-gold-300">
                      <Icon d={I.briefcase} className="w-5 h-5" />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[.08] text-xs">
                    <div>
                      <p className="text-mist text-[10px] uppercase">Enrolled Students</p>
                      <p className="font-bold text-cream text-base mt-0.5">{enrolledStudents.length} Students</p>
                    </div>
                    <div>
                      <p className="text-mist text-[10px] uppercase">Total Hours</p>
                      <p className="font-bold text-emerald text-base mt-0.5">{fmtMinutesToHours(batchMins)}</p>
                    </div>
                  </div>

                  {/* Isolated Batch Download Buttons */}
                  <div className="pt-2 border-t border-white/[.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => downloadAttendancePDF(batchAtt, b.name, dateRangeTextLabel)}
                      className="flex-1 py-2 rounded-xl bg-brand/15 text-brand-300 border border-brand/25 text-[11px] font-semibold hover:bg-brand/25 transition-all text-center"
                    >
                      📄 Download {b.year} PDF
                    </button>
                    <button
                      onClick={() => downloadCSV(batchAtt, b.name)}
                      className="flex-1 py-2 rounded-xl bg-white/[.05] border border-white/[.1] text-cream text-[11px] font-semibold hover:bg-white/[.08] transition-all text-center"
                    >
                      📊 CSV Export
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 3: LEADERBOARD & RANKINGS (🥇 🥈 🥉)
         ═══════════════════════════════════════════════════ */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {studentRankings.slice(0, 3).map((std, idx) => {
              const medals = ["🥇 Rank 1", "🥈 Rank 2", "🥉 Rank 3"];
              const borderColors = [
                "border-gold/40 bg-gold/[.05] ring-2 ring-gold/30",
                "border-mist/40 bg-white/[.04]",
                "border-coral/40 bg-coral/[.05]"
              ];
              return (
                <div key={std.id} className={`card-premium p-6 text-center space-y-3 relative overflow-hidden ${borderColors[idx]}`}>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/[.08] text-cream border border-white/[.1]">
                    {medals[idx]}
                  </span>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-gold grid place-items-center text-white font-display text-2xl font-bold mx-auto shadow-lg">
                    {std.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-cream">{std.name}</h3>
                    <p className="text-xs text-mist mt-0.5">{std.roll_number} • {std.batch_name}</p>
                  </div>
                  <div className="pt-3 border-t border-white/[.08] flex justify-around text-xs">
                    <div>
                      <p className="text-mist text-[10px] uppercase">Completed Hours</p>
                      <p className="font-bold text-cream text-lg mt-0.5">{fmtMinutesToHours(std.totalMins)}</p>
                    </div>
                    <div className="w-px bg-white/[.08]" />
                    <div>
                      <p className="text-mist text-[10px] uppercase">Present Days</p>
                      <p className="font-bold text-emerald text-lg mt-0.5">{std.presentDays} days</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-cream">Full Leaderboard Rankings</h3>
                <p className="text-xs text-mist">Ranked by total completed working hours (Highest hours first)</p>
              </div>
              <button onClick={() => downloadCSV(filteredAttendance)} className="px-3.5 py-1.5 rounded-lg border border-white/[.1] bg-white/[.04] text-xs font-semibold text-cream hover:bg-white/[.08]">
                Export Leaderboard CSV
              </button>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[.08] text-mist font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Roll Number</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Present Days</th>
                    <th className="py-3 px-3">Late Count</th>
                    <th className="py-3 px-3">Total Working Hours</th>
                    <th className="py-3 px-3">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRankings.map((s, idx) => (
                    <tr key={s.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                      <td className="py-3 px-3 font-display font-bold text-sm text-cream">
                        {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 font-semibold text-cream">{s.name}</td>
                      <td className="py-3 px-3 font-mono text-mist">{s.roll_number}</td>
                      <td className="py-3 px-3 text-cream">{s.batch_name}</td>
                      <td className="py-3 px-3 font-semibold text-emerald">{s.presentDays} days</td>
                      <td className="py-3 px-3 font-semibold text-gold">{s.lateCount} times</td>
                      <td className="py-3 px-3 font-bold text-cream text-sm">{fmtMinutesToHours(s.totalMins)}</td>
                      <td className="py-3 px-3">
                        {idx === 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold/20 text-gold-300 border border-gold/30">
                            🌟 Top Performer
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[.05] text-mist">
                            Active Student
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 4: TIMELINE & PROFILES
         ═══════════════════════════════════════════════════ */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-premium p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-cream">Select Student</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin pr-1">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedStudent?.id === s.id
                        ? "border-brand bg-brand/10 text-cream"
                        : "border-white/[.07] bg-white/[.02] text-mist hover:text-cream hover:bg-white/[.04]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-cream">{s.name}</p>
                      <p className="text-[10px] text-mist mt-0.5">{s.roll_number} • {s.batch_name}</p>
                    </div>
                    <span className="text-xs text-brand-300 font-medium">View Timeline →</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 card-premium p-6 space-y-5">
              {selectedStudent ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-cream">{selectedStudent.name}</h3>
                      <p className="text-xs text-mist mt-0.5">
                        Roll: <span className="text-cream font-mono font-semibold">{selectedStudent.roll_number}</span> • Batch: <span className="text-cream font-semibold">{selectedStudent.batch_name}</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald/15 text-emerald border border-emerald/30">
                      Active Student
                    </span>
                  </div>

                  <div className="space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald before:via-gold before:to-brand">
                    <div className="relative flex items-center gap-4 p-3.5 rounded-xl bg-white/[.03] border border-white/[.07]">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald ring-4 ring-ink-950" />
                      <div>
                        <p className="text-xs font-mono font-bold text-emerald">09:05 AM</p>
                        <p className="text-xs font-semibold text-cream">Biometric Check In</p>
                        <p className="text-[11px] text-mist mt-0.5">Device: ZKTeco K40 Main Gate</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4 p-3.5 rounded-xl bg-white/[.03] border border-white/[.07]">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gold ring-4 ring-ink-950" />
                      <div>
                        <p className="text-xs font-mono font-bold text-gold">01:00 PM</p>
                        <p className="text-xs font-semibold text-cream">Lunch & Practice Break</p>
                        <p className="text-[11px] text-mist mt-0.5">Duration: 45 mins</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4 p-3.5 rounded-xl bg-white/[.03] border border-white/[.07]">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brand ring-4 ring-ink-950" />
                      <div>
                        <p className="text-xs font-mono font-bold text-brand-300">05:30 PM</p>
                        <p className="text-xs font-semibold text-cream">Biometric Check Out</p>
                        <p className="text-[11px] text-mist mt-0.5">Total Session Duration: 8h 25m</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <Icon d={I.users} className="w-10 h-10 text-mist/40 mx-auto" />
                  <p className="text-mist text-sm">Select a student from the left panel to view detailed timeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 5: CUSTOM RANGE REPORTS & DOWNLOADS
         ═══════════════════════════════════════════════════ */}
      {activeTab === "reports" && (
        <div className="card-premium p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-cream">Date-wise & Custom Range Reports</h3>
              <p className="text-xs text-mist">Current Selected Filter: <strong className="text-brand-300">{dateRangeTextLabel}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[.03] border border-white/[.08] space-y-3">
              <h4 className="font-display text-base font-semibold text-cream flex items-center gap-2">
                📄 Download Selected Range PDF
              </h4>
              <p className="text-xs text-mist">Generates PDF report for <strong>{dateRangeTextLabel}</strong> containing present count and completed hours.</p>
              <button
                onClick={() => downloadAttendancePDF(filteredAttendance, batchFilter, dateRangeTextLabel)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-xs font-semibold hover:shadow-lg transition-all"
              >
                Download PDF Report ({dateRangePreset})
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white/[.03] border border-white/[.08] space-y-3">
              <h4 className="font-display text-base font-semibold text-cream flex items-center gap-2">
                📊 Download Selected Range CSV
              </h4>
              <p className="text-xs text-mist">Exports CSV file for <strong>{dateRangeTextLabel}</strong> with student names, roll numbers, times, and total minutes.</p>
              <button
                onClick={() => downloadCSV(filteredAttendance)}
                className="w-full py-2.5 rounded-xl border border-white/[.1] bg-white/[.05] text-cream text-xs font-semibold hover:bg-white/[.08] transition-all"
              >
                Export CSV Data ({dateRangePreset})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 6: BIOMETRIC DEVICES CONTROL & DIRECT AUTO-CONNECT
         ═══════════════════════════════════════════════════ */}
      {activeTab === "devices" && (
        <div className="space-y-6">
          <div className="card-premium p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald grid place-items-center">
                <Icon d={I.bolt} className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-cream">Direct Biometric Auto-Connect Engine</h3>
                <p className="text-xs text-mist mt-0.5">When fingerprint machine turns ON, CRM automatically connects and receives attendance logs.</p>
              </div>
            </div>
            <button
              onClick={() => setShowDeviceSetupModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald text-xs font-semibold hover:bg-emerald/25 transition-all"
            >
              ⚡ View Setup Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map(dev => {
              const isSecureye = dev.brand === "Secureye" || dev.model === "S-FB5K";
              return (
                <div key={dev.id} className={`card-premium p-5 space-y-3 relative overflow-hidden ${isSecureye ? "border-brand/50 bg-brand/5 ring-1 ring-brand/30" : ""}`}>
                  {isSecureye && (
                    <div className="absolute top-0 right-0 bg-brand text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow">
                      ⭐ Your Machine (S-FB5K)
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald/15 text-emerald border border-emerald/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-ping" />
                      {dev.status}
                    </span>
                    <span className="text-[11px] font-mono text-mist">{dev.ip}</span>
                  </div>
                  <div>
                    <h4 className="font-display text-base font-semibold text-cream">{dev.name}</h4>
                    <p className="text-xs text-mist mt-0.5">Location: {dev.location}</p>
                    {dev.serial && <p className="text-[11px] font-mono text-brand-300 mt-1">S/N: {dev.serial}</p>}
                  </div>
                  <div className="pt-2 border-t border-white/[.07] flex justify-between text-xs text-mist">
                    <span>Brand: <strong className="text-cream">{dev.brand}</strong></span>
                    <span>Status: <strong className="text-emerald">{dev.lastSync}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ MODALS ═══════ */}
      {/* 1. Mark Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowMarkModal(false)} />
          <div className="relative card-premium p-6 w-full max-w-md space-y-4 animate-rise shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">Mark Attendance (Manual)</h2>
              <button onClick={() => setShowMarkModal(false)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Student Name *</span>
                <input
                  type="text"
                  value={markStudent}
                  onChange={(e) => setMarkStudent(e.target.value)}
                  placeholder="e.g. Rohit Shinde"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Check In Time *</span>
                  <input
                    type="time"
                    value={markInTime}
                    onChange={(e) => setMarkInTime(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Check Out Time *</span>
                  <input
                    type="time"
                    value={markOutTime}
                    onChange={(e) => setMarkOutTime(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Status *</span>
                <select
                  value={markStatus}
                  onChange={(e) => setMarkStatus(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </label>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all">
                Save Attendance Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add New Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowAddBatchModal(false)} />
          <div className="relative card-premium p-6 w-full max-w-md space-y-4 animate-rise shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">📚 Create New Batch</h2>
              <button onClick={() => setShowAddBatchModal(false)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Batch Name *</span>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. 2027 Batch"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Year *</span>
                  <input
                    type="number"
                    value={newBatchYear}
                    onChange={(e) => setNewBatchYear(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Trainer Name</span>
                  <input
                    type="text"
                    value={newBatchTrainer}
                    onChange={(e) => setNewBatchTrainer(e.target.value)}
                    placeholder="e.g. Nikhil Modi"
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Course *</span>
                <input
                  type="text"
                  value={newBatchCourse}
                  onChange={(e) => setNewBatchCourse(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all">
                Save & Create Batch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add New Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowAddStudentModal(false)} />
          <div className="relative card-premium p-6 w-full max-w-md space-y-4 animate-rise shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-cream">👤 Add Student to Batch</h2>
              <button onClick={() => setShowAddStudentModal(false)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Roll Number *</span>
                  <input
                    type="text"
                    value={newStdRoll}
                    onChange={(e) => setNewStdRoll(e.target.value)}
                    placeholder="e.g. TP-010"
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50 font-mono"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-mist uppercase tracking-wider font-medium">Assign Batch *</span>
                  <select
                    value={newStdBatch}
                    onChange={(e) => setNewStdBatch(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  >
                    {batches.map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Student Full Name *</span>
                <input
                  type="text"
                  value={newStdName}
                  onChange={(e) => setNewStdName(e.target.value)}
                  placeholder="e.g. Omkar Deshmukh"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-mist uppercase tracking-wider font-medium">Phone Number</span>
                <input
                  type="text"
                  value={newStdPhone}
                  onChange={(e) => setNewStdPhone(e.target.value)}
                  placeholder="e.g. 9822001122"
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-ink-950 border border-white/[.08] text-sm text-cream focus:outline-none focus:border-brand/50"
                />
              </label>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-lg transition-all">
                Save & Assign Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Machine Setup Modal */}
      {showDeviceSetupModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowDeviceSetupModal(false)} />
          <div className="relative card-premium p-6 w-full max-w-lg space-y-4 animate-rise shadow-lift max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-display font-semibold text-cream">📟 Secureye Biometric Setup Guide</h2>
                <p className="text-[11px] text-brand font-medium">Model: Secureye S-FB5K (Face + Fingerprint + RFID)</p>
              </div>
              <button onClick={() => setShowDeviceSetupModal(false)} className="text-mist hover:text-cream">
                <Icon d={I.x} className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-mist">
              <div className="p-3 rounded-xl bg-brand/10 border border-brand/25 text-cream space-y-1">
                <p className="font-semibold text-brand">✨ Automatic Live Sync Setup (ADMS / Cloud Push):</p>
                <p className="text-[11px] text-mist">Aapka <strong>Secureye IP Face & Fingerprint</strong> device Ethernet/Wi-Fi se direct CRM Server par attendance Push kar sakta hai.</p>
              </div>

              <div className="space-y-2">
                <p className="text-cream font-semibold">⚙️ Secureye Machine Menu Steps:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] bg-white/[.03] p-3 rounded-xl border border-white/10 text-cream/90 font-sans">
                  <li>Machine me <strong>MENU</strong> button press karein.</li>
                  <li><strong>Comm. (Communication) Settings</strong> me jayein.</li>
                  <li><strong>Network / Ethernet Settings</strong> me IP Address / Wi-Fi connect karein.</li>
                  <li><strong>Cloud Server / ADMS / Web Server</strong> option open karein.</li>
                  <li><strong>Enable Cloud Server:</strong> <span className="text-emerald font-bold">ON</span></li>
                  <li><strong>Server Address:</strong> <span className="text-emerald font-mono font-bold">your-crm-domain.com</span> (ya local IP)</li>
                  <li><strong>Server Port:</strong> <span className="text-emerald font-mono font-bold">5001</span></li>
                  <li>Save karein aur machine Restart karein.</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-white/[.03] border border-white/[.08] space-y-1 font-mono text-[11px]">
                <p className="text-cream font-sans font-semibold">📡 API Endpoint Format:</p>
                <p className="text-emerald">POST /api/biometric/attendance</p>
                <p className="text-mist text-[10px]">Payload: &#123; user_id, timestamp, status, device_sn: "02379B92D13" &#125;</p>
              </div>

              <p className="text-[11px] text-mist/80">
                💾 <strong>USB Backup Method:</strong> Network connect na ho toh Machine se USB Pendrive me Attendance Log `.xlsx` / `.dat` export karke <strong>Import File</strong> button se upload kar sakte hain.
              </p>
            </div>

            <button
              onClick={() => setShowDeviceSetupModal(false)}
              className="w-full py-2.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-300 transition-all shadow-lg shadow-brand/20"
            >
              Done / Close Setup Guide
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
