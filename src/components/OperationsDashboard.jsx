import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useCountUp } from "../hooks/useCountUp";
import { Icon, I } from "./icons";
import localMembersRaw from "../../scripts/members_data.json";

const DAILY_REPORT_KEY = "taal-daily-dhol-report-v1";

const FALLBACK_DHOLS = Array.from({ length: 54 }, (_, i) => {
  const number = i + 1;
  return {
    id: number,
    dhol_number: number,
    size: number <= 10 ? 30 : number <= 52 ? 28 : 26,
  };
});

const FALLBACK_PAN = [
  { pane_type: "old", size: '26"', thapi: 3, dhoom: 3 },
  { pane_type: "old", size: '28"', thapi: 39, dhoom: 51 },
  { pane_type: "old", size: '30"', thapi: 8, dhoom: 9 },
  { pane_type: "new", size: '26"', thapi: 0, dhoom: 0 },
  { pane_type: "new", size: '28"', thapi: 0, dhoom: 0 },
  { pane_type: "new", size: '30"', thapi: 0, dhoom: 0 },
];

const MODULES = [
  {
    label: "Shifting 1",
    title: "Assets Inventory",
    text: "Custodian, category and stock control.",
    icon: I.briefcase,
    tone: "text-amber-300",
    gradient: "from-amber-500/20 to-orange-500/5",
    border: "border-amber-500/30",
  },
  {
    label: "Dhol Pan",
    title: "Dhol Pan Stock",
    text: "Old pane, new pane and size-wise counts.",
    icon: I.chart,
    tone: "text-sky-300",
    gradient: "from-sky-500/20 to-blue-500/5",
    border: "border-sky-500/30",
  },
  {
    label: "Dhol Maintenance",
    title: "Dhol Maintenance",
    text: "Cycle health, due dhols and repair records.",
    icon: I.sliders,
    tone: "text-rose-400",
    gradient: "from-rose-500/20 to-red-500/5",
    border: "border-rose-500/30",
  },
  {
    label: "Daily Report",
    title: "Daily Dhol Report",
    text: "Fodne and banane forms with daily history.",
    icon: I.note,
    tone: "text-emerald-300",
    gradient: "from-emerald-500/20 to-teal-500/5",
    border: "border-emerald-500/30",
  },
  {
    label: "New Member Exam",
    title: "Member Exams",
    text: "Registration intake and exam status.",
    icon: I.users,
    tone: "text-purple-300",
    gradient: "from-purple-500/20 to-pink-500/5",
    border: "border-purple-500/30",
  },
  {
    label: "Expenses",
    title: "Expense Management",
    text: "Track team expenses with bill images and payment details.",
    icon: I.dollar,
    tone: "text-amber-400",
    gradient: "from-amber-400/20 to-yellow-500/5",
    border: "border-amber-400/30",
  },
];

function parseQty(qty) {
  const nums = String(qty || "").match(/\d+/g);
  return nums ? nums.reduce((sum, n) => sum + Number(n), 0) : 0;
}

function daysAgo(date) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function maintenanceStatus(date) {
  const days = daysAgo(date);
  if (days === Infinity) return "never";
  if (days > 13) return "overdue";
  if (days >= 6) return "due";
  return "ok";
}

function CountValue({ value }) {
  const numeric = Number(value);
  const count = useCountUp(Number.isFinite(numeric) ? numeric : 0, 1100);
  if (!Number.isFinite(numeric)) return value;
  return Math.round(count).toLocaleString("en-IN");
}

function StatCard({ label, value, sub, icon, tone, gradient, ringColor }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient || "from-white/[0.07] to-white/[0.02]"} p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/70">{label}</p>
          <p className={`mt-2.5 font-display text-3xl font-extrabold tabular-nums tracking-tight ${tone}`}>
            <CountValue value={value} />
          </p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/40 ${tone} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
          <Icon d={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium leading-relaxed text-mist/70">{sub}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-cream/90">{label}</span>
        <span className="text-mist font-semibold tabular-nums">{value} <span className="text-[10px] text-mist/50">({pct}%)</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/40 border border-white/5 p-0.5">
        <div className={`h-full rounded-full ${color} transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RingGraph({ ok, due, risk, total }) {
  const safeTotal = total || 1;
  const okPct = (ok / safeTotal) * 100;
  const duePct = (due / safeTotal) * 100;
  const riskPct = (risk / safeTotal) * 100;

  return (
    <div className="relative mx-auto h-48 w-48 my-2">
      <div
        className="absolute inset-0 rounded-full shadow-2xl transition-all duration-1000 ease-out"
        style={{
          background: `conic-gradient(#38BDF8 0 ${okPct}%, #F59E0B ${okPct}% ${okPct + duePct}%, #F43F5E ${okPct + duePct}% ${okPct + duePct + riskPct}%, rgba(255,255,255,.08) 0)`,
        }}
      />
      <div className="absolute inset-4 rounded-full border border-white/10 bg-ink-950/90 backdrop-blur-md grid place-items-center text-center shadow-inner">
        <div>
          <p className="font-display text-4xl font-extrabold text-cream tabular-nums">
            <CountValue value={risk} />
          </p>
          <p className="text-[10px] uppercase font-bold tracking-[.18em] text-rose-400 mt-0.5">At Risk</p>
        </div>
      </div>
    </div>
  );
}

function SparkBars({ items, max }) {
  const shown = items.length ? items : [{ label: "No entries", value: 0, color: "bg-ink-500" }];
  return (
    <div className="flex h-44 items-end gap-2.5 pt-4">
      {shown.map((item, index) => {
        const pct = max ? Math.max(10, Math.round((item.value / max) * 100)) : 10;
        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2 group">
            <div className="flex h-32 w-full items-end rounded-xl bg-black/40 border border-white/5 p-1">
              <div
                className={`w-full rounded-lg ${item.color} transition-all duration-1000 ease-out shadow-md group-hover:brightness-125`}
                style={{ height: `${pct}%`, transitionDelay: `${index * 80}ms` }}
              />
            </div>
            <span className="max-w-full truncate text-[10px] font-medium text-mist/70 group-hover:text-cream">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ModuleCard({ module, metric, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(module.label)}
      className={`relative overflow-hidden rounded-2xl border ${module.border} bg-gradient-to-br ${module.gradient} p-5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl group cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/50 ${module.tone} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
          <Icon d={module.icon} className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-mist uppercase tracking-wider group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-cream transition-all">
          Open →
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-cream group-hover:text-white">{module.title}</h3>
      <p className="mt-1 text-xs leading-5 text-mist/70 line-clamp-2">{module.text}</p>
      <div className="mt-4 pt-3 border-t border-white/10 flex items-end justify-between gap-3">
        <p className={`font-display text-2xl font-extrabold tabular-nums ${module.tone}`}>{metric.value}</p>
        <p className="text-right text-[11px] font-medium text-mist/60 uppercase tracking-wider">{metric.label}</p>
      </div>
    </button>
  );
}

function WorkItem({ label, value, tone, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-all duration-200 hover:bg-white/[0.07] hover:border-white/20 active:scale-[0.99] cursor-pointer group"
    >
      <span className="text-xs font-semibold text-cream/90 group-hover:text-white">{label}</span>
      <span className={`text-xs font-bold tabular-nums rounded-lg bg-black/40 px-2.5 py-1 border border-white/5 ${tone}`}>{value}</span>
    </button>
  );
}

export default function OperationsDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    assets: [],
    pan: FALLBACK_PAN,
    dhols: FALLBACK_DHOLS,
    maintenance: [],
    members: localMembersRaw,
    dailyReports: [],
    expenses: [],
  });

  const readDailyReports = () => {
    try {
      return JSON.parse(localStorage.getItem(DAILY_REPORT_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [assetsRes, panRes, dholsRes, maintRes, membersRes, expensesRes] = await Promise.all([
      supabase.from("taal_assets").select("*"),
      supabase.from("dhol_pan").select("*"),
      supabase.from("dhols").select("*").order("dhol_number"),
      supabase.from("dhol_maintenance").select("*").order("maintenance_date", { ascending: false }),
      supabase.from("new_members").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
    ]);

    setData({
      assets: assetsRes.error ? [] : assetsRes.data || [],
      pan: !panRes.error && panRes.data?.length ? panRes.data : FALLBACK_PAN,
      dhols: !dholsRes.error && dholsRes.data?.length ? dholsRes.data : FALLBACK_DHOLS,
      maintenance: maintRes.error ? [] : maintRes.data || [],
      members: !membersRes.error && membersRes.data?.length ? membersRes.data : localMembersRaw,
      expenses: !expensesRes.error && expensesRes.data?.length ? expensesRes.data : [],
      dailyReports: readDailyReports(),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("operations-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "taal_assets" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "dhol_pan" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "dhols" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "dhol_maintenance" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "new_members" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, loadDashboard)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const assets = Array.isArray(data?.assets) ? data.assets : [];
    const pan = Array.isArray(data?.pan) ? data.pan : FALLBACK_PAN;
    const dhols = Array.isArray(data?.dhols) ? data.dhols : FALLBACK_DHOLS;
    const maintenance = Array.isArray(data?.maintenance) ? data.maintenance : [];
    const members = Array.isArray(data?.members) ? data.members : localMembersRaw;
    const dailyReports = Array.isArray(data?.dailyReports) ? data.dailyReports : [];
    const expenses = Array.isArray(data?.expenses) ? data.expenses : [];

    const assetUnits = assets.reduce((sum, asset) => sum + parseQty(asset.qty), 0);
    const assetCategories = new Set(assets.map((asset) => asset.category).filter(Boolean)).size;
    const assetCustodians = new Set(assets.map((asset) => asset.custodian).filter(Boolean)).size;

    const paneOld = pan
      .filter((row) => row.pane_type === "old")
      .reduce((sum, row) => sum + Number(row.thapi || 0) + Number(row.dhoom || 0), 0);
    const paneNew = pan
      .filter((row) => row.pane_type === "new")
      .reduce((sum, row) => sum + Number(row.thapi || 0) + Number(row.dhoom || 0), 0);

    const maintByDhol = {};
    maintenance.forEach((record) => {
      if (!maintByDhol[record.dhol_id]) maintByDhol[record.dhol_id] = [];
      maintByDhol[record.dhol_id].push(record);
    });

    const health = { ok: 0, due: 0, overdue: 0, never: 0 };
    dhols.forEach((dhol) => {
      const lastDate = maintByDhol[dhol.id]?.[0]?.maintenance_date;
      health[maintenanceStatus(lastDate)] += 1;
    });

    const dholSize = {
      30: dhols.filter((dhol) => Number(dhol.size) === 30).length,
      28: dhols.filter((dhol) => Number(dhol.size) === 28).length,
      26: dhols.filter((dhol) => Number(dhol.size) === 26).length,
    };

    const pending = members.filter((member) => !member.exam_status || member.exam_status === "pending").length;
    const passed = members.filter((member) => member.exam_status === "passed").length;
    const failed = members.filter((member) => member.exam_status === "failed").length;
    const dholMembers = members.filter((member) => String(member.instruments_played || "").toLowerCase().includes("dhol")).length;
    const tashaMembers = members.filter((member) => String(member.instruments_played || "").toLowerCase().includes("tasha")).length;

    const today = new Date().toISOString().slice(0, 10);
    const todayReports = dailyReports.filter((report) => report.reportDate === today);
    const workMap = todayReports.reduce((acc, report) => {
      const key = report.workType || report.brokenPart || report.reportType || "Update";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const workBreakdown = Object.entries(workMap)
      .map(([label, value], index) => ({
        label,
        value,
        color: ["bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-purple-500"][index % 5],
      }))
      .slice(0, 6);

    return {
      assetRecords: assets.length,
      assetUnits,
      assetCategories,
      assetCustodians,
      paneOld,
      paneNew,
      paneTotal: paneOld + paneNew,
      health,
      dholSize,
      members: members.length,
      pending,
      passed,
      failed,
      dholMembers,
      tashaMembers,
      maintenanceRecords: maintenance.length,
      dailyReports: dailyReports.length,
      todayReports: todayReports.length,
      todayBroken: todayReports.filter((report) => report.reportType === "Dhol Fodne" || report.brokenBy).length,
      todayMade: todayReports.filter((report) => report.reportType === "Dhol Banane" || report.madeBy).length,
      totalExpenses: expenses.length,
      monthlyExpenses: expenses.filter((expense) => {
        const expenseDate = new Date(expense.billDate || expense.bill_date);
        const now = new Date();
        return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
      }).length,
      onlineExpenses: expenses.filter((expense) => expense.payment_method === "online").length,
      cashExpenses: expenses.filter((expense) => expense.payment_method === "cash").length,
      workBreakdown,
    };
  }, [data]);

  const riskCount = summary.health.overdue + summary.health.never;
  const maxWork = Math.max(1, ...summary.workBreakdown.map((item) => item.value));

  const moduleMetrics = MODULES.reduce((acc, module) => {
    switch (module.label) {
      case "Shifting 1":
        acc[module.label] = { value: summary.assetRecords, label: `${summary.assetUnits}+ units` };
        break;
      case "Dhol Pan":
        acc[module.label] = { value: summary.paneTotal, label: `${summary.paneOld} old / ${summary.paneNew} new` };
        break;
      case "Dhol Maintenance":
        acc[module.label] = { value: riskCount, label: "need attention" };
        break;
      case "Daily Report":
        acc[module.label] = { value: summary.todayReports, label: "today entries" };
        break;
      case "New Member Exam":
        acc[module.label] = { value: summary.members, label: `${summary.pending} pending` };
        break;
      case "Expenses":
      case "Expences":
      case "Expense Tracker":
        acc[module.label] = { value: summary.totalExpenses, label: "total expenses" };
        break;
      default:
        acc[module.label] = { value: 0, label: "" };
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-64 rounded-2xl bg-white/[0.05] border border-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-white/[0.05] border border-white/10" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 rounded-2xl bg-white/[0.05] border border-white/10" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── ULTRA-PREMIUM HERO BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-gradient-to-r from-ink-950 via-[#180808] to-ink-950 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_.9fr] items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-brand-300 shadow-inner">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                TAAL Command Center
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-mist">
                Live Operations Telemetry
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl xl:text-5xl leading-tight">
              Taal Pathak Operations Suite
            </h1>
            <p className="mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-mist/80">
              Real-time control room for Dhol fleet maintenance, Pan stock, candidate exams, daily reports, and asset tracking.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate("Daily Report")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-5 text-xs font-bold text-white shadow-lg shadow-rose-950/50 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Icon d={I.note} className="h-4 w-4" />
                <span>+ Add Daily Report</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("Dhol Maintenance")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 text-xs font-semibold text-cream transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Icon d={I.sliders} className="h-4 w-4" />
                <span>Review Maintenance</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/60">Dhol Fleet</p>
              <p className="mt-2 font-display text-3xl font-extrabold text-sky-300 tabular-nums"><CountValue value={data.dhols.length} /></p>
              <p className="mt-1 text-[11px] font-medium text-mist/60">30 / 28 / 26 mapped</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/60">Pane Stock Total</p>
              <p className="mt-2 font-display text-3xl font-extrabold text-amber-300 tabular-nums"><CountValue value={summary.paneTotal} /></p>
              <p className="mt-1 text-[11px] font-medium text-mist/60">{summary.paneOld} old / {summary.paneNew} new</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/60">Today Reports</p>
              <p className="mt-2 font-display text-3xl font-extrabold text-emerald-300 tabular-nums"><CountValue value={summary.todayReports} /></p>
              <p className="mt-1 text-[11px] font-medium text-mist/60">{summary.todayBroken} broken / {summary.todayMade} made</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-mist/60">Attention Needed</p>
              <p className="mt-2 font-display text-3xl font-extrabold text-rose-400 tabular-nums"><CountValue value={riskCount + summary.pending} /></p>
              <p className="mt-1 text-[11px] font-medium text-mist/60">maintenance + exams</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI STAT CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Asset Records" value={summary.assetRecords} sub={`${summary.assetCategories} categories, ${summary.assetCustodians} custodians`} tone="text-amber-300" icon={I.briefcase} gradient="from-amber-500/15 via-orange-500/5 to-transparent" />
        <StatCard label="Dhol Pane Stock" value={summary.paneTotal} sub={`${summary.paneOld} old pane and ${summary.paneNew} new pane`} tone="text-sky-300" icon={I.chart} gradient="from-sky-500/15 via-blue-500/5 to-transparent" />
        <StatCard label="Maintenance Risk" value={riskCount} sub={`${summary.health.due} due soon, ${summary.health.ok} maintained`} tone="text-rose-400" icon={I.target} gradient="from-rose-500/15 via-red-500/5 to-transparent" />
        <StatCard label="Exam Pending" value={summary.pending} sub={`${summary.passed} passed, ${summary.failed} failed, ${summary.members} total`} tone="text-emerald-300" icon={I.users} gradient="from-emerald-500/15 via-teal-500/5 to-transparent" />
      </div>

      {/* ── MODULE CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <ModuleCard key={module.label} module={module} metric={moduleMetrics[module.label]} onNavigate={onNavigate} />
        ))}
      </div>

      {/* ── ANIMATED CHARTS & QUICK ACTIONS ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl lg:col-span-2 shadow-xl space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-cream">Live Operations Telemetry</h2>
              <p className="mt-0.5 text-xs text-mist/70">Real-time health cycle from Dhol, Pane, and Daily Report telemetry.</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
              Live Feed
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mist/70">Dhol Maintenance Cycle</h3>
              <RingGraph ok={summary.health.ok} due={summary.health.due} risk={riskCount} total={data.dhols.length} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-mist/80">
                <span className="rounded-lg bg-sky-500/10 border border-sky-500/20 py-1"><span className="text-sky-300">OK:</span> {summary.health.ok}</span>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 py-1"><span className="text-amber-300">Due:</span> {summary.health.due}</span>
                <span className="rounded-lg bg-rose-500/10 border border-rose-500/20 py-1"><span className="text-rose-400">Risk:</span> {riskCount}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mist/70">Today's Work Breakdown</h3>
              <SparkBars items={summary.workBreakdown} max={maxWork} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="border-b border-white/10 pb-4 mb-4">
              <h2 className="font-display text-lg font-bold text-cream">Today's Action Queue</h2>
              <p className="mt-0.5 text-xs text-mist/70">Fast navigation triggers based on CRM data.</p>
            </div>
            <div className="space-y-3">
              <WorkItem label="Daily dhol entries today" value={summary.todayReports} tone="text-emerald-300" onClick={() => onNavigate("Daily Report")} />
              <WorkItem label="Dhols needing maintenance" value={riskCount} tone="text-rose-400" onClick={() => onNavigate("Dhol Maintenance")} />
              <WorkItem label="Member exams pending" value={summary.pending} tone="text-amber-300" onClick={() => onNavigate("New Member Exam")} />
              <WorkItem label="Pane stock to verify" value={summary.paneTotal} tone="text-sky-300" onClick={() => onNavigate("Dhol Pan")} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-[11px] text-mist/50">TAAL Pathak Pune · CRM v2.5</p>
          </div>
        </section>
      </div>

      {/* ── SPLIT METRIC BARS ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl shadow-xl">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-mist/80">Pane Stock Split</h2>
          <div className="mt-5 space-y-4">
            <BarRow label="Old Pane Stock" value={summary.paneOld} total={summary.paneTotal} color="bg-gradient-to-r from-rose-500 to-red-600" />
            <BarRow label="New Pane Stock" value={summary.paneNew} total={summary.paneTotal} color="bg-gradient-to-r from-sky-400 to-blue-500" />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl shadow-xl">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-mist/80">Dhol Size Distribution</h2>
          <div className="mt-5 space-y-4">
            <BarRow label={'30" Dhol'} value={summary.dholSize[30]} total={data.dhols.length} color="bg-gradient-to-r from-amber-400 to-orange-500" />
            <BarRow label={'28" Dhol'} value={summary.dholSize[28]} total={data.dhols.length} color="bg-gradient-to-r from-sky-400 to-blue-500" />
            <BarRow label={'26" Dhol'} value={summary.dholSize[26]} total={data.dhols.length} color="bg-gradient-to-r from-purple-400 to-pink-500" />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl shadow-xl">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-mist/80">Member Applicant Breakdown</h2>
          <div className="mt-5 space-y-4">
            <BarRow label="Dhol Interest" value={summary.dholMembers} total={summary.members} color="bg-gradient-to-r from-rose-500 to-red-600" />
            <BarRow label="Tasha Interest" value={summary.tashaMembers} total={summary.members} color="bg-gradient-to-r from-sky-400 to-blue-500" />
            <BarRow label="Exam Passed" value={summary.passed} total={summary.members} color="bg-gradient-to-r from-emerald-400 to-teal-500" />
          </div>
        </section>
      </div>
    </div>
  );
}
