import { useState, useEffect } from "react";
import { Icon, I } from "./icons";
import { supabase } from "../lib/supabase";

/* ─── Color maps ─── */
const STAT_COLORS = {
  blue:  { ring: "ring-sky-500/20",    glow: "bg-sky-500/10",    text: "text-sky-300",    icon: "text-sky-400"    },
  green: { ring: "ring-emerald-500/20",glow: "bg-emerald-500/10",text: "text-emerald-300",icon: "text-emerald-400"},
  amber: { ring: "ring-amber-500/20",  glow: "bg-amber-500/10",  text: "text-amber-300",  icon: "text-amber-400"  },
  brand: { ring: "ring-rose-500/20",   glow: "bg-rose-500/10",   text: "text-rose-300",   icon: "text-rose-400"   },
};

const EVENT_STYLES = {
  login:  { dot: "bg-emerald-400", label: "Login",  icon: "✅" },
  logout: { dot: "bg-rose-400",    label: "Logout", icon: "🚪" },
};

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, color, icon }) {
  const c = STAT_COLORS[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.025] p-5 ring-1 ${c.ring} transition-all hover:bg-white/[.04]`}>
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${c.glow} blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-mist/70 uppercase">{label}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${c.text}`}>{value}</p>
          <p className="mt-1 text-[11px] text-mist/50">{sub}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] ${c.icon}`}>
          <Icon d={icon} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Format datetime ─── */
function formatDateTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + `, ${time}`;
}

/* ─── Activity Log (Real Supabase data) ─── */
function ActivityLog({ logs, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 animate-pulse">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/10" />
              <div className="h-2.5 w-1/2 rounded bg-white/[.06]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-mist/40">
        <Icon d={I.calendar} className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No activity logs yet</p>
        <p className="text-xs mt-1">Login/logout events will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log, i) => {
        const style = EVENT_STYLES[log.event_type] || EVENT_STYLES.login;
        return (
          <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.03]">
            <div className="relative mt-1.5 shrink-0">
              <span className={`block h-2.5 w-2.5 rounded-full ${style.dot} shadow-[0_0_6px_rgba(0,0,0,.3)]`} />
              {i < logs.length - 1 && (
                <span className="absolute left-[4px] top-3.5 h-full w-px bg-white/[.06]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-cream/80">
                <span className="mr-1.5">{style.icon}</span>
                <span className="font-semibold text-cream">{log.user_name}</span>
                {" "}
                <span className={log.event_type === "login" ? "text-emerald-400/80" : "text-rose-400/80"}>
                  {style.label}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-mist/50">
                {log.user_email && (
                  <span className="font-medium text-mist/60">{log.user_email} · </span>
                )}
                {formatDateTime(log.logged_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Quick Actions ─── */
const QUICK_ACTIONS = [
  { label: "Export All Data",    icon: I.note,     color: "sky"    },
  { label: "Send Announcement",  icon: I.mail,     color: "amber"  },
  { label: "System Backup",      icon: I.shield,   color: "emerald"},
];
const QA_COLORS = {
  sky:     "border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20",
  amber:   "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
};

/* ─── Main Component ─── */
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ students: 0, expenses: 0, reports: 0, members: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch real stats from Supabase
  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      try {
        const [studentsRes, expensesRes, reportsRes, membersRes] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("expenses").select("id", { count: "exact", head: true }),
          supabase.from("daily_reports").select("id", { count: "exact", head: true }),
          supabase.from("new_members").select("id", { count: "exact", head: true }),
        ]);
        setStats({
          students: studentsRes.count ?? 0,
          expenses: expensesRes.count ?? 0,
          reports: reportsRes.count ?? 0,
          members: membersRes.count ?? 0,
        });
      } catch (err) {
        console.warn("Stats fetch error:", err);
      }
      setStatsLoading(false);
    }
    fetchStats();
  }, []);

  // Fetch activity logs from Supabase
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("auth_activity_logs")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Activity logs fetch error:", error.message);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    }
    fetchLogs();

    // Real-time subscription for live updates
    const channel = supabase
      .channel("auth-activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auth_activity_logs" }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const LIVE_STATS = [
    { label: "Total Students",   value: statsLoading ? "…" : String(stats.students), sub: "Supabase → students",     color: "blue",  icon: I.users  },
    { label: "Expenses Logged",  value: statsLoading ? "…" : String(stats.expenses), sub: "Supabase → expenses",     color: "green", icon: I.dollar },
    { label: "Daily Reports",    value: statsLoading ? "…" : String(stats.reports),  sub: "Supabase → daily_reports", color: "amber", icon: I.note   },
    { label: "New Members",      value: statsLoading ? "…" : String(stats.members),  sub: "Supabase → new_members",  color: "brand", icon: I.target },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,.2)]">
              <Icon d={I.shield} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-cream">Admin Panel</h1>
              <p className="text-sm text-mist/60">System overview & login/logout activity</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-white/[.06] bg-white/[.03] p-1">
            {["overview", "activity"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-mist hover:text-cream"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <>
          {/* Stats grid — real Supabase counts */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {LIVE_STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist/70">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${QA_COLORS[a.color]}`}
                >
                  <Icon d={a.icon} className="h-4 w-4 shrink-0" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Login/Logout Activity (preview in overview) */}
          <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-mist/70">Recent Login / Logout</h2>
              <button
                onClick={() => setActiveTab("activity")}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                View All →
              </button>
            </div>
            <ActivityLog logs={logs.slice(0, 6)} loading={loading} />
          </div>
        </>
      )}

      {/* ── ACTIVITY TAB ── */}
      {activeTab === "activity" && (
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-mist/70">
              Login / Logout Activity Log
              <span className="ml-2 rounded-full border border-white/[.08] bg-white/[.04] px-2 py-0.5 text-[11px] font-medium text-mist/50">
                {logs.length} events
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-mist/50">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Login
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-mist/50">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Logout
              </span>
            </div>
          </div>
          <ActivityLog logs={logs} loading={loading} />
        </div>
      )}
    </div>
  );
}
