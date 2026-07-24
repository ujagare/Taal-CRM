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
    tone: "text-gold-300",
  },
  {
    label: "Dhol Pan",
    title: "Dhol Pan Stock",
    text: "Old pane, new pane and size-wise counts.",
    icon: I.chart,
    tone: "text-sky",
  },
  {
    label: "Dhol Maintenance",
    title: "Dhol Maintenance",
    text: "Cycle health, due dhols and repair records.",
    icon: I.sliders,
    tone: "text-brand-300",
  },
  {
    label: "Daily Report",
    title: "Daily Dhol Report",
    text: "Fodne and banane forms with daily history.",
    icon: I.note,
    tone: "text-emerald",
  },
  {
    label: "New Member Exam",
    title: "Member Exams",
    text: "Registration intake and exam status.",
    icon: I.users,
    tone: "text-coral",
  },
  {
    label: "Expense Tracker",
    title: "Expense Management",
    text: "Track team expenses with bill images and payment details.",
    icon: I.dollar,
    tone: "text-gold-300",
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
  const count = useCountUp(Number.isFinite(numeric) ? numeric : 0, 1050);
  if (!Number.isFinite(numeric)) return value;
  return Math.round(count).toLocaleString("en-IN");
}

function StatCard({ label, value, sub, icon, tone }) {
  return (
    <div className="card-premium relative min-h-[132px] overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-wide" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[.16em] text-mist">{label}</p>
          <p className={`mt-3 font-display text-3xl font-semibold tabular-nums ${tone}`}>
            <CountValue value={value} />
          </p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] ${tone}`}>
          <Icon d={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-mist">{sub}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-sm">
        <span className="text-cream/90">{label}</span>
        <span className="text-mist tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.07]">
        <div className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
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
    <div className="relative mx-auto h-48 w-48">
      <div
        className="absolute inset-0 rounded-full animate-scale-in"
        style={{
          background: `conic-gradient(#38BDF8 0 ${okPct}%, #F59E0B ${okPct}% ${okPct + duePct}%, #DC2626 ${okPct + duePct}% ${okPct + duePct + riskPct}%, rgba(255,255,255,.08) 0)`,
        }}
      />
      <div className="absolute inset-4 rounded-full border border-white/[.07] bg-ink-900 grid place-items-center text-center">
        <div>
          <p className="font-display text-4xl font-semibold tabular-nums">
            <CountValue value={risk} />
          </p>
          <p className="text-[11px] uppercase tracking-[.16em] text-mist">At Risk</p>
        </div>
      </div>
    </div>
  );
}

function SparkBars({ items, max }) {
  const shown = items.length ? items : [{ label: "No entries", value: 0, color: "bg-ink-500" }];
  return (
    <div className="flex h-44 items-end gap-2">
      {shown.map((item, index) => {
        const pct = max ? Math.max(8, Math.round((item.value / max) * 100)) : 8;
        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end rounded-lg bg-white/[.04] p-1">
              <div
                className={`w-full rounded-md ${item.color} transition-all duration-1000 ease-out`}
                style={{ height: `${pct}%`, transitionDelay: `${index * 90}ms` }}
              />
            </div>
            <span className="max-w-full truncate text-[10px] text-mist">{item.label}</span>
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
      className="card-premium group min-h-[164px] p-5 text-left transition-all hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-white/[.05] ${module.tone}`}>
          <Icon d={module.icon} className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-white/[.07] bg-white/[.04] px-2.5 py-1 text-[11px] text-mist group-hover:text-cream">
          Open
        </span>
      </div>
      <h3 className="mt-5 font-display text-lg text-cream">{module.title}</h3>
      <p className="mt-1 text-sm leading-5 text-mist">{module.text}</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className={`font-display text-2xl tabular-nums ${module.tone}`}>{metric.value}</p>
        <p className="text-right text-xs text-mist">{metric.label}</p>
      </div>
    </button>
  );
}

function WorkItem({ label, value, tone, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-white/[.035] px-4 py-3 text-left transition-colors hover:bg-white/[.06]"
    >
      <span className="text-sm text-cream/90">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
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
        color: ["bg-brand", "bg-gold", "bg-sky", "bg-emerald", "bg-coral"][index % 5],
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
      <div className="space-y-5">
        <div className="card h-64 shimmer" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card h-36 shimmer" />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="card h-80 xl:col-span-2 shimmer" />
          <div className="card h-80 shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <section className="dashboard-hero overflow-hidden rounded-xl border border-white/[.08] bg-ink-900/90 shadow-premium-xl">
        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulseDot" />
                TAAL Live Command
              </span>
              <span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-xs text-mist">
                Internal operations snapshot
              </span>
            </div>
            <h1 className="mt-5 font-display text-3xl leading-tight text-cream sm:text-4xl xl:text-5xl">
              Taal Pathak Operations Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
              Assets, dhol pan, maintenance cycle, daily dhol report and new member exams in one premium responsive control room.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("Daily Report")}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-cream px-4 text-sm font-bold text-ink-950 transition-all hover:-translate-y-0.5 hover:bg-gold-300"
              >
                <Icon d={I.note} className="h-4 w-4" />
                Add Daily Report
              </button>
              <button
                onClick={() => onNavigate("Dhol Maintenance")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.05] px-4 text-sm font-semibold text-cream transition-colors hover:bg-white/[.08]"
              >
                <Icon d={I.sliders} className="h-4 w-4" />
                Review Maintenance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[.07] bg-white/[.045] p-4">
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Dhol Fleet</p>
              <p className="mt-2 font-display text-3xl text-sky tabular-nums"><CountValue value={data.dhols.length} /></p>
              <p className="mt-1 text-xs text-mist">30 / 28 / 26 mapped</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.045] p-4">
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Pane Total</p>
              <p className="mt-2 font-display text-3xl text-gold-300 tabular-nums"><CountValue value={summary.paneTotal} /></p>
              <p className="mt-1 text-xs text-mist">old + new stock</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.045] p-4">
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Today Report</p>
              <p className="mt-2 font-display text-3xl text-emerald tabular-nums"><CountValue value={summary.todayReports} /></p>
              <p className="mt-1 text-xs text-mist">{summary.todayBroken} broken / {summary.todayMade} made</p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.045] p-4">
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Attention</p>
              <p className="mt-2 font-display text-3xl text-brand-300 tabular-nums"><CountValue value={riskCount + summary.pending} /></p>
              <p className="mt-1 text-xs text-mist">maintenance + exams</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Asset Records" value={summary.assetRecords} sub={`${summary.assetCategories} categories, ${summary.assetCustodians} custodians`} tone="text-gold-300" icon={I.briefcase} />
        <StatCard label="Dhol Pane" value={summary.paneTotal} sub={`${summary.paneOld} old pane and ${summary.paneNew} new pane`} tone="text-sky" icon={I.chart} />
        <StatCard label="Maintenance Risk" value={riskCount} sub={`${summary.health.due} due soon, ${summary.health.ok} recently maintained`} tone="text-brand-300" icon={I.target} />
        <StatCard label="Exam Pending" value={summary.pending} sub={`${summary.passed} passed, ${summary.failed} failed, ${summary.members} total`} tone="text-emerald" icon={I.users} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
        {MODULES.map((module) => (
          <ModuleCard key={module.label} module={module} metric={moduleMetrics[module.label]} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card-premium p-6 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Animated Operations Graphs</h2>
              <p className="mt-0.5 text-xs text-mist">Live health from dhol, pane, daily report and member modules.</p>
            </div>
            <span className="rounded-full border border-emerald/20 bg-emerald/10 px-2.5 py-1 text-[11px] text-emerald">
              Premium live view
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-xl border border-white/[.07] bg-white/[.03] p-4">
              <h3 className="text-sm font-semibold">Dhol Maintenance Ring</h3>
              <RingGraph ok={summary.health.ok} due={summary.health.due} risk={riskCount} total={data.dhols.length} />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-mist">
                <span><span className="text-sky">OK</span> {summary.health.ok}</span>
                <span><span className="text-gold">Due</span> {summary.health.due}</span>
                <span><span className="text-brand">Risk</span> {riskCount}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[.07] bg-white/[.03] p-4">
              <h3 className="text-sm font-semibold">Today's Dhol Work Type</h3>
              <SparkBars items={summary.workBreakdown} max={maxWork} />
            </div>
          </div>
        </section>

        <section className="card-premium p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg">Today's Work Queue</h2>
            <p className="mt-0.5 text-xs text-mist">Fast actions based on real CRM data.</p>
          </div>
          <div className="space-y-3">
            <WorkItem label="Daily dhol entries today" value={summary.todayReports} tone="text-emerald" onClick={() => onNavigate("Daily Report")} />
            <WorkItem label="Dhols needing maintenance" value={riskCount} tone="text-brand-300" onClick={() => onNavigate("Dhol Maintenance")} />
            <WorkItem label="Member exams pending" value={summary.pending} tone="text-gold-300" onClick={() => onNavigate("New Member Exam")} />
            <WorkItem label="Pane stock to verify" value={summary.paneTotal} tone="text-sky" onClick={() => onNavigate("Dhol Pan")} />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card-premium p-6">
          <h2 className="font-display text-lg">Pane Stock Split</h2>
          <div className="mt-5 space-y-4">
            <BarRow label="Old Pane" value={summary.paneOld} total={summary.paneTotal} color="bg-brand" />
            <BarRow label="New Pane" value={summary.paneNew} total={summary.paneTotal} color="bg-sky" />
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="font-display text-lg">Dhol Size Mix</h2>
          <div className="mt-5 space-y-4">
            <BarRow label={'30" Dhol'} value={summary.dholSize[30]} total={data.dhols.length} color="bg-gold" />
            <BarRow label={'28" Dhol'} value={summary.dholSize[28]} total={data.dhols.length} color="bg-sky" />
            <BarRow label={'26" Dhol'} value={summary.dholSize[26]} total={data.dhols.length} color="bg-coral" />
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="font-display text-lg">Member Intake</h2>
          <div className="mt-5 space-y-4">
            <BarRow label="Dhol interest" value={summary.dholMembers} total={summary.members} color="bg-brand" />
            <BarRow label="Tasha interest" value={summary.tashaMembers} total={summary.members} color="bg-sky" />
            <BarRow label="Exam passed" value={summary.passed} total={summary.members} color="bg-emerald" />
          </div>
        </section>
      </div>
    </div>
  );
}
