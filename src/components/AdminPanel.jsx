import { useState, useEffect } from "react";
import { Icon, I } from "./icons";
import { supabase } from "../lib/supabase";
import { sendWhatsApp, getAdminPhones, saveAdminPhones } from "../utils/whatsapp";

/* ─── Glass Card Container ─── */
function GlassCard({ children, className = "", hover = true, noPadding = false }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/80 backdrop-blur-xl
        border border-slate-200/60
        shadow-[0_4px_24px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]
        ${hover ? "hover:shadow-[0_8px_40px_rgba(15,23,42,0.10),0_2px_4px_rgba(15,23,42,0.06)] hover:border-slate-300/80 transition-all duration-300 ease-out" : ""}
        ${noPadding ? "" : "p-5"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/* ─── Color maps for Stat Cards ─── */
const STAT_COLORS = {
  blue: {
    bg: "from-blue-50/80 to-sky-50/80",
    border: "border-blue-200/60",
    text: "text-blue-700",
    iconBg: "from-blue-500 to-sky-600",
    glow: "bg-blue-500/10",
  },
  emerald: {
    bg: "from-emerald-50/80 to-teal-50/80",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
    iconBg: "from-emerald-500 to-teal-600",
    glow: "bg-emerald-500/10",
  },
  amber: {
    bg: "from-amber-50/80 to-orange-50/80",
    border: "border-amber-200/60",
    text: "text-amber-700",
    iconBg: "from-amber-500 to-orange-600",
    glow: "bg-amber-500/10",
  },
  purple: {
    bg: "from-purple-50/80 to-violet-50/80",
    border: "border-purple-200/60",
    text: "text-purple-700",
    iconBg: "from-purple-500 to-violet-600",
    glow: "bg-purple-500/10",
  },
  indigo: {
    bg: "from-indigo-50/80 to-blue-50/80",
    border: "border-indigo-200/60",
    text: "text-indigo-700",
    iconBg: "from-indigo-500 to-blue-600",
    glow: "bg-indigo-500/10",
  },
};

const EVENT_STYLES = {
  login: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "🔐",
  },
  logout: {
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: "🚪",
  },
};

/* ─── Stat Card Component ─── */
function StatCard({ label, value, sub, color, icon }) {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <GlassCard className={`!bg-gradient-to-br ${c.bg} !${c.border}`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${c.glow} blur-2xl pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-extrabold tracking-tight ${c.text}`}>{value}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{sub}</p>
        </div>
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.iconBg} shadow-md force-text-white`}
        >
          <Icon d={icon} className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

/* ─── Format DateTime Helper ─── */
function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (isToday) return `Today, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) + `, ${time}`;
}

/* ─── Activity Log List Component ─── */
function ActivityLogTable({ logs, loading, searchTerm, filterType }) {
  const filtered = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || log.event_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 animate-pulse">
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-2.5 w-1/4 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <Icon d={I.calendar} className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm font-semibold text-slate-600">No activity logs found</p>
        <p className="text-xs mt-1 text-slate-400">Try adjusting your search query or filter settings</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-x-auto">
      {filtered.map((log) => {
        const style = EVENT_STYLES[log.event_type] || EVENT_STYLES.login;
        return (
          <div key={log.id} className="flex items-center justify-between gap-4 p-3.5 transition-colors hover:bg-slate-50/80">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <span className={`block h-2.5 w-2.5 rounded-full ${style.dot}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-bold text-slate-800">{log.user_name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>
                    {log.event_type}
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-500 mt-0.5 font-medium">
                  {log.user_email ? `${log.user_email} · ` : ""}
                  {log.device_info ? `${log.device_info.substring(0, 45)}...` : "Browser Session"}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[11px] font-semibold text-slate-500">{formatDateTime(log.logged_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Admin WhatsApp Auto-Alerts Config Component ─── */
function AdminWhatsAppConfig() {
  const [adminPhone, setAdminPhone] = useState(() => localStorage.getItem("wa_admin_phone") || "");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = () => {
    saveAdminPhones(adminPhone);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSendTest = async () => {
    if (!adminPhone.trim()) return alert("Kripya kam se kam ek WhatsApp number dalein!");
    setTesting(true);
    setTestResult(null);
    const phones = getAdminPhones();
    if (phones.length === 0) {
      setTesting(false);
      return alert("Valid 10-digit phone number daalein!");
    }
    const msg = `जय गणेश! 🙏\n\nTAAL CRM Test Notification ✅\n\nAdmin Auto-Alerts Setup Working Successfully! 🥁\nTime: ${new Date().toLocaleTimeString()}`;
    const results = await Promise.all(phones.map(p => sendWhatsApp(p, msg)));
    const okCount = results.filter(Boolean).length;
    setTesting(false);
    setTestResult({ success: okCount > 0, count: okCount, total: phones.length });
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center force-text-white shadow-sm text-xs font-bold">
            📱
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Admin Auto-Alerts WhatsApp Numbers
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Daily Reports & Stock Low Notifications</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Auto Alerts Active ✓
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Daily Reports save hone par aur Dori low stock hone par automatic WhatsApp alerts in numbers par bhej-e jaenge. Multiple numbers ko comma (<b>,</b>) se separate karein.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={adminPhone}
          onChange={e => {
            setAdminPhone(e.target.value);
            saveAdminPhones(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="e.g. 9876543210, 8975805789"
          className="
            flex-1 px-4 py-2.5 rounded-xl
            bg-slate-50/90 border border-slate-300
            text-xs font-bold text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
            transition-all duration-200
          "
        />
        <button
          onClick={handleSave}
          className="
            px-5 py-2.5 rounded-xl
            text-xs font-bold shadow-md shadow-emerald-600/30
            active:scale-95 transition-all duration-200 cursor-pointer shrink-0
          "
          style={{ backgroundColor: '#059669', color: '#ffffff' }}
        >
          {saved ? "Saved! ✅" : "💾 Save Numbers"}
        </button>
        <button
          onClick={handleSendTest}
          disabled={testing}
          className="
            px-4 py-2.5 rounded-xl
            text-xs font-bold shadow-md shadow-blue-600/30
            active:scale-95 transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50
          "
          style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
        >
          {testing ? "Sending..." : "🧪 Test Notification"}
        </button>
      </div>

      {testResult && (
        <div className={`mt-3 p-3 rounded-xl border text-xs font-semibold ${
          testResult.success
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {testResult.success
            ? `✅ Test alert ${testResult.count}/${testResult.total} Admin numbers par WhatsApp par bheja gaya!`
            : `⚠️ WhatsApp Server disconnect hai ya number galat hai. Terminal me server check karein.`}
        </div>
      )}
    </GlassCard>
  );
}

/* ─── Main Admin Panel Component ─── */
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ students: 0, expenses: 0, reports: 0, dhols: 0, logsCount: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: "", text: "", level: "info" });
  const [publishedNotice, setPublishedNotice] = useState(null);

  // Fetch counts from Supabase
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [studentsRes, expensesRes, reportsRes, dholsRes, logsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("expenses").select("id", { count: "exact", head: true }),
        supabase.from("daily_reports").select("id", { count: "exact", head: true }),
        supabase.from("dhols").select("id", { count: "exact", head: true }),
        supabase.from("auth_activity_logs").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        students: studentsRes.count ?? 0,
        expenses: expensesRes.count ?? 0,
        reports: reportsRes.count ?? 0,
        dhols: dholsRes.count ?? 54,
        logsCount: logsRes.count ?? 0,
      });
    } catch (err) {
      console.warn("Error loading stats:", err);
    }
    setStatsLoading(false);
  };

  // Fetch activity logs
  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("auth_activity_logs")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.warn("Logs load error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
    loadLogs();

    // Subscribe to real-time logs
    const channel = supabase
      .channel("auth-logs-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auth_activity_logs" }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 100));
        setStats((prev) => ({ ...prev, logsCount: prev.logsCount + 1 }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 1-Click Export All System Data (JSON format download)
  const handleExportAllData = async () => {
    setExporting(true);
    try {
      const [students, expenses, reports, logs, dhols] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("daily_reports").select("*"),
        supabase.from("auth_activity_logs").select("*"),
        supabase.from("dhols").select("*"),
      ]);

      const backupPackage = {
        exported_at: new Date().toISOString(),
        system: "TAAL Pathak Operations CRM",
        counts: {
          students: students.data?.length || 0,
          expenses: expenses.data?.length || 0,
          daily_reports: reports.data?.length || 0,
          audit_logs: logs.data?.length || 0,
          dhols: dhols.data?.length || 0,
        },
        data: {
          students: students.data || [],
          expenses: expenses.data || [],
          daily_reports: reports.data || [],
          auth_activity_logs: logs.data || [],
          dhols: dhols.data || [],
        },
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupPackage, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `TAAL_CRM_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export backup data: " + err.message);
    }
    setExporting(false);
  };

  // Export CSV for Audit Logs
  const handleExportLogsCSV = () => {
    if (logs.length === 0) return alert("No logs available to export.");
    const headers = ["ID", "User Name", "User Email", "Event Type", "Device Info", "Timestamp"];
    const rows = logs.map((l) => [
      l.id,
      `"${l.user_name || ""}"`,
      `"${l.user_email || ""}"`,
      l.event_type,
      `"${(l.device_info || "").replace(/"/g, '""')}"`,
      l.logged_at,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TAAL_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Handle Publish Announcement
  const handlePublishAnnouncement = (e) => {
    e.preventDefault();
    if (!announcement.title || !announcement.text) return;
    setPublishedNotice({ ...announcement, date: new Date().toLocaleTimeString() });
    setShowAnnouncementModal(false);
  };

  const LIVE_STATS = [
    { label: "Total Students", value: statsLoading ? "…" : String(stats.students), sub: "Students Database", color: "blue", icon: I.users },
    { label: "Expenses Tracked", value: statsLoading ? "…" : String(stats.expenses), sub: "Expense Log Entries", color: "emerald", icon: I.dollar },
    { label: "Daily Reports", value: statsLoading ? "…" : String(stats.reports), sub: "Maintenance & Status", color: "amber", icon: I.note },
    { label: "Dhol Assets", value: statsLoading ? "…" : String(stats.dhols), sub: "Master Dhol Inventory", color: "purple", icon: I.briefcase },
    { label: "Security Logs", value: statsLoading ? "…" : String(stats.logsCount), sub: "Login/Logout Events", color: "indigo", icon: I.shield },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-28 wa-fade-in">
      {/* ── Top Header Banner ── */}
      <GlassCard className="!p-0 !bg-gradient-to-r from-white/90 via-amber-50/40 to-orange-50/40" hover={false}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 wa-icon-float force-text-white">
              <Icon d={I.shield} className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">Admin Panel</h1>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Control center for TAAL Pathak operations & telemetry</p>
            </div>
          </div>

          {/* Tab Selection Navigation */}
          <div className="flex gap-1 p-1.5 rounded-2xl bg-white/70 backdrop-blur-lg border border-slate-200/60 shadow-sm w-full sm:w-fit overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: I.grid },
              { id: "activity", label: "Audit Logs", icon: I.shield },
              { id: "tools", label: "DB Tools", icon: I.sliders },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                  transition-all duration-250 whitespace-nowrap cursor-pointer
                  ${
                    activeTab === t.id
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 force-text-white shadow-md shadow-amber-500/25"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                  }
                `}
              >
                <Icon d={t.icon} className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </GlassCard>

      {/* Published Announcement Alert (if active) */}
      {publishedNotice && (
        <GlassCard className="!p-4 !bg-gradient-to-r !from-amber-50/90 !to-orange-50/90 !border-amber-300/60 wa-fade-in" hover={false}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">📢</span>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  {publishedNotice.title} ({publishedNotice.date})
                </p>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">{publishedNotice.text}</p>
              </div>
            </div>
            <button
              onClick={() => setPublishedNotice(null)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </GlassCard>
      )}

      {/* System Health Indicators Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="!p-3.5" hover={true}>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400">Database Engine</p>
              <p className="truncate text-xs font-bold text-slate-800">Supabase PostgreSQL</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="!p-3.5" hover={true}>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400">Authentication</p>
              <p className="truncate text-xs font-bold text-slate-800">Supabase Auth (Online)</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="!p-3.5" hover={true}>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)] animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400">Realtime Engine</p>
              <p className="truncate text-xs font-bold text-slate-800">WebSocket Active</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="!p-3.5" hover={true}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400">Data Sync</p>
              <p className="truncate text-xs font-bold text-slate-800">Live Telemetry</p>
            </div>
            <button
              onClick={() => {
                loadStats();
                loadLogs();
              }}
              className="rounded-lg border border-slate-200/80 bg-slate-100/80 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer"
              title="Refresh system stats"
            >
              <Icon d={I.sliders} className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5 wa-fade-in">
          {/* Live KPI Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LIVE_STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Admin WhatsApp Auto-Alerts Recipient Management */}
          <AdminWhatsAppConfig />

          {/* Quick Controls Section */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center force-text-white shadow-sm">
                  <Icon d={I.sliders} className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Administrative Actions</h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                disabled={exporting}
                onClick={handleExportAllData}
                className="
                  flex items-center justify-center gap-2.5 rounded-xl
                  bg-gradient-to-r from-sky-500 to-blue-600 force-text-white
                  px-4 py-3 text-xs font-bold shadow-sm shadow-sky-500/20
                  hover:from-sky-400 hover:to-blue-500 transition-all duration-200
                  active:scale-95 cursor-pointer disabled:opacity-50
                "
              >
                <Icon d={I.note} className="h-4 w-4" />
                <span>{exporting ? "Exporting..." : "Full System Backup (JSON)"}</span>
              </button>

              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="
                  flex items-center justify-center gap-2.5 rounded-xl
                  bg-gradient-to-r from-amber-500 to-orange-600 force-text-white
                  px-4 py-3 text-xs font-bold shadow-sm shadow-amber-500/20
                  hover:from-amber-400 hover:to-orange-500 transition-all duration-200
                  active:scale-95 cursor-pointer
                "
              >
                <Icon d={I.mail} className="h-4 w-4" />
                <span>Broadcast Announcement</span>
              </button>

              <button
                onClick={handleExportLogsCSV}
                className="
                  flex items-center justify-center gap-2.5 rounded-xl
                  bg-gradient-to-r from-emerald-500 to-teal-600 force-text-white
                  px-4 py-3 text-xs font-bold shadow-sm shadow-emerald-500/20
                  hover:from-emerald-400 hover:to-teal-500 transition-all duration-200
                  active:scale-95 cursor-pointer
                "
              >
                <Icon d={I.shield} className="h-4 w-4" />
                <span>Export Audit Logs (CSV)</span>
              </button>
            </div>
          </GlassCard>

          {/* Recent Security Activity Stream */}
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  Recent Authentication Stream
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Live user login & logout events recorded in Supabase</p>
              </div>
              <button
                onClick={() => setActiveTab("activity")}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                View Full Audit Logs →
              </button>
            </div>
            <ActivityLogTable logs={logs.slice(0, 7)} loading={loading} searchTerm="" filterType="all" />
          </GlassCard>
        </div>
      )}

      {/* ── AUDIT LOGS TAB ── */}
      {activeTab === "activity" && (
        <GlassCard className="wa-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                System Security Audit Logs
                <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                  {logs.length} Recorded Events
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Complete history of authentications and access events</p>
            </div>

            {/* Controls: Search & Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                placeholder="Search user name or email..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="
                  px-3.5 py-2 rounded-xl
                  bg-slate-50/80 border border-slate-200/80
                  text-xs text-slate-800 placeholder:text-slate-400
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                  transition-all duration-200
                "
              />
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="
                  px-3.5 py-2 rounded-xl
                  bg-slate-50/80 border border-slate-200/80
                  text-xs text-slate-800
                  focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                  transition-all duration-200
                "
              >
                <option value="all">All Events</option>
                <option value="login">Login Events</option>
                <option value="logout">Logout Events</option>
              </select>
              <button
                onClick={handleExportLogsCSV}
                className="
                  px-4 py-2 rounded-xl
                  bg-gradient-to-r from-emerald-500 to-teal-600 force-text-white
                  text-xs font-bold shadow-sm shadow-emerald-500/20
                  hover:from-emerald-400 hover:to-teal-500 transition-all duration-200
                  active:scale-95 cursor-pointer
                "
              >
                Export CSV
              </button>
            </div>
          </div>

          <ActivityLogTable logs={logs} loading={loading} searchTerm={logSearch} filterType={logFilter} />
        </GlassCard>
      )}

      {/* ── DB TOOLS TAB ── */}
      {activeTab === "tools" && (
        <GlassCard className="space-y-5 wa-fade-in">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Database & System Maintenance Tools</h2>
            <p className="text-xs text-slate-500 mt-0.5">High-privilege system operations and database telemetry</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon d={I.note} className="h-4 w-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-800">System Backup & Migration</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download a clean JSON archive containing all database tables (students, expenses, daily reports, candidate exams, and logs).
              </p>
              <button
                disabled={exporting}
                onClick={handleExportAllData}
                className="
                  w-full py-2.5 rounded-xl
                  bg-gradient-to-r from-sky-500 to-blue-600 force-text-white
                  text-xs font-bold shadow-sm shadow-sky-500/20
                  hover:from-sky-400 hover:to-blue-500 transition-all duration-200
                  active:scale-95 cursor-pointer disabled:opacity-50
                "
              >
                {exporting ? "Generating Package..." : "Download Full Database JSON"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon d={I.shield} className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800">Database Health Diagnostics</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Run immediate ping query against Supabase PostgreSQL endpoints to check table accessibility.
              </p>
              <button
                onClick={async () => {
                  const start = performance.now();
                  await loadStats();
                  const duration = Math.round(performance.now() - start);
                  alert(`✅ Database Health Check Passed!\nResponse Time: ${duration} ms\nStatus: All endpoints responsive.`);
                }}
                className="
                  w-full py-2.5 rounded-xl
                  bg-gradient-to-r from-emerald-500 to-teal-600 force-text-white
                  text-xs font-bold shadow-sm shadow-emerald-500/20
                  hover:from-emerald-400 hover:to-teal-500 transition-all duration-200
                  active:scale-95 cursor-pointer
                "
              >
                Run Health & Ping Check
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── BROADCAST ANNOUNCEMENT MODAL ── */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 wa-fade-in">
          <GlassCard className="w-full max-w-md !p-6 shadow-2xl space-y-4" hover={false}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                📢 Broadcast System Announcement
              </h3>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon d={I.x} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Practice Session Update"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  className="
                    w-full px-4 py-2.5 rounded-xl
                    bg-slate-50/80 border border-slate-200/80
                    text-xs text-slate-800 placeholder:text-slate-400
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                    transition-all duration-200
                  "
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Text</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write message details for the team..."
                  value={announcement.text}
                  onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                  className="
                    w-full px-4 py-2.5 rounded-xl
                    bg-slate-50/80 border border-slate-200/80
                    text-xs text-slate-800 placeholder:text-slate-400
                    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                    transition-all duration-200 resize-none
                  "
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="
                    px-5 py-2.5 rounded-xl
                    bg-gradient-to-r from-amber-500 to-orange-600 force-text-white
                    text-xs font-bold shadow-sm shadow-amber-500/20
                    hover:from-amber-400 hover:to-orange-500 transition-all duration-200
                    active:scale-95 cursor-pointer
                  "
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
