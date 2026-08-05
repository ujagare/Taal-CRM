import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon, I } from "./icons";
import { supabase } from "../lib/supabase";

const LOCAL_STORAGE_KEY = "taal_local_expenses_v1";

/* ─── Constants ────────────────────────────────────── */
const CATEGORIES = [
  { value: "equipment", label: "Equipment", emoji: "🥁" },
  { value: "travel", label: "Travel", emoji: "🚗" },
  { value: "food", label: "Food & Drinks", emoji: "🍽️" },
  { value: "repair", label: "Repair & Parts", emoji: "🔧" },
  { value: "event", label: "Event", emoji: "🎪" },
  { value: "uniform", label: "Uniform", emoji: "👕" },
  { value: "other", label: "Other", emoji: "📦" },
];

const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c;
  return acc;
}, {});

const PAYMENT_COLORS = {
  cash: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/25" },
  online: {
    bg: "bg-emerald/10",
    text: "text-emerald",
    border: "border-emerald/25",
  },
};

const emptyForm = {
  payer_name: "",
  item_description: "",
  amount: "",
  category: "other",
  bill_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  image_url: "",
  notes: "",
};

const DATE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

/* ─── Helpers ──────────────────────────────────────── */
function formatCurrency(num) {
  if (!num && num !== 0) return "₹0";
  return (
    "₹" +
    Number(num).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatDateShort(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function isInDateRange(dateStr, filter) {
  if (filter === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === "today") {
    return d >= todayStart;
  }
  if (filter === "week") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return d >= weekStart;
  }
  if (filter === "month") {
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }
  return true;
}

function downloadCSV(expenses) {
  const headers = [
    "Date",
    "Paid By",
    "Item",
    "Amount (₹)",
    "Category",
    "Payment Method",
    "Notes",
    "Bill Image URL",
  ];

  const rows = expenses.map((e) => [
    e.bill_date || "",
    e.payer_name || "",
    e.item_description || "",
    e.amount || 0,
    CATEGORY_MAP[e.category]?.label || e.category || "",
    e.payment_method || "",
    (e.notes || "").replace(/,/g, ";").replace(/\n/g, " "),
    e.image_url || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ─── Animated Counter ─────────────────────────────── */
function AnimatedValue({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 900;
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

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ─── Toast Component ──────────────────────────────── */
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-lift backdrop-blur-xl animate-rise ${
        type === "success"
          ? "bg-emerald/15 text-emerald border border-emerald/25"
          : type === "error"
            ? "bg-brand/15 text-brand-300 border border-brand/25"
            : "bg-gold/15 text-gold border border-gold/25"
      }`}
    >
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ️"}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
      >
        <Icon d={I.x} className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Bill Image Viewer Modal ──────────────────────── */
function ImageViewer({ url, onClose }) {
  if (!url) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/55 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] overflow-y-auto scroll-thin animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-ink-800 border border-white/10 text-cream hover:bg-ink-700 transition-colors shadow-lift"
        >
          <Icon d={I.x} className="w-4 h-4" />
        </button>
        <img
          src={url}
          alt="Bill"
          className="max-w-full max-h-[85vh] rounded-xl border border-white/10 shadow-lift object-contain"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-white/[.06] border border-white/[.08] px-4 py-2.5 text-sm text-mist hover:text-cream hover:bg-white/[.1] transition-all"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open Full Size
        </a>
      </div>
    </div>,
    document.body
  );
}

/* ─── Stat Card ────────────────────────────────────── */
function StatCard({ label, value, prefix, icon, tone, sub }) {
  return (
    <div className="card-premium relative min-h-[120px] overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[.16em] text-mist">
            {label}
          </p>
          <p
            className={`mt-2.5 font-display text-3xl font-semibold tabular-nums ${tone}`}
          >
            <AnimatedValue value={value} prefix={prefix} />
          </p>
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] ${tone}`}
        >
          {icon}
        </span>
      </div>
      {sub && <p className="mt-2.5 text-xs text-mist">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewImage, setViewImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  /* ─── Data Loading with Fallback ────────────────── */
  const loadExpenses = useCallback(async () => {
    let loadedData = [];
    let fromRemote = false;

    // Always have local cache ready as baseline
    let localCache = [];
    try {
      localCache = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch { /* ignore */ }

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("bill_date", { ascending: false });

      // Trust remote data as long as there is no error — even if 0 rows (table was cleared)
      if (!error && Array.isArray(data)) {
        loadedData = data;
        fromRemote = true;
      }
    } catch (err) {
      console.warn("Supabase expenses query failed, using local storage:", err);
    }

    if (!fromRemote) {
      loadedData = localCache;
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedData));
    }

    setExpenses(loadedData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("expense-tracker-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        loadExpenses,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadExpenses]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [showForm]);

  /* ─── Image Upload ─────────────────────────────── */
  const handleImageUpload = async (file) => {
    if (!file) return null;
    setUploading(true);

    // Create local Data URL fallback so image always works
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const localDataUrl = ev.target.result;
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

          const { error } = await supabase.storage
            .from("expense-bills")
            .upload(fileName, file);

          if (!error) {
            const { data: urlData } = supabase.storage
              .from("expense-bills")
              .getPublicUrl(fileName);
            setUploading(false);
            resolve(urlData.publicUrl);
            return;
          }
        } catch (err) {
          console.warn(
            "Supabase storage upload error, fallback to data URL:",
            err,
          );
        }
        setUploading(false);
        resolve(localDataUrl);
      };
      reader.readAsDataURL(file);
    });
  };

  /* ─── Save / Update Expense ────────────────────── */
  const saveExpense = async (e) => {
    e.preventDefault();
    setSaving(true);

    const expenseData = {
      id:
        editingId ||
        `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      payer_name: form.payer_name.trim(),
      item_description: form.item_description.trim(),
      amount: parseFloat(form.amount) || 0,
      category: form.category || "other",
      bill_date: form.bill_date || new Date().toISOString().split("T")[0],
      payment_method: form.payment_method || "cash",
      image_url: form.image_url || null,
      notes: form.notes.trim() || null,
      created_at: new Date().toISOString(),
    };

    let remoteSaved = false;

    try {
      if (editingId && !String(editingId).startsWith("local-")) {
        const { error } = await supabase
          .from("expenses")
          .update({
            payer_name: expenseData.payer_name,
            item_description: expenseData.item_description,
            amount: expenseData.amount,
            category: expenseData.category,
            bill_date: expenseData.bill_date,
            payment_method: expenseData.payment_method,
            image_url: expenseData.image_url,
            notes: expenseData.notes,
          })
          .eq("id", editingId);

        if (!error) remoteSaved = true;
      } else {
        const { id, created_at, ...insertPayload } = expenseData;
        const { data: inserted, error } = await supabase
          .from("expenses")
          .insert([insertPayload])
          .select();

        if (!error && inserted && inserted.length > 0) {
          expenseData.id = inserted[0].id;
          remoteSaved = true;
        }
      }
    } catch (err) {
      console.warn("Supabase save failed, storing locally:", err);
    }

    // Always update state & local storage for instant success
    setExpenses((prev) => {
      let updated;
      if (editingId) {
        updated = prev.map((item) =>
          item.id === editingId ? expenseData : item,
        );
      } else {
        updated = [expenseData, ...prev];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (remoteSaved) {
      showToast(editingId ? "✅ Expense updated!" : "✅ Expense saved to Supabase!");
    } else {
      showToast(
        editingId
          ? "⚠️ Expense updated locally only (check internet/Supabase)"
          : "⚠️ Expense saved locally! (Supabase connect nahi hua — check internet)",
        "info",
      );
    }

    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
    setSaving(false);
  };

  /* ─── Delete Expense ───────────────────────────── */
  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;
    try {
      if (!String(id).startsWith("local-")) {
        await supabase.from("expenses").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase delete error:", err);
    }

    setExpenses((prev) => {
      const updated = prev.filter((exp) => exp.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast("Expense deleted!");
  };

  /* ─── Edit Expense ─────────────────────────────── */
  const startEdit = (expense) => {
    setForm({
      payer_name: expense.payer_name || "",
      item_description: expense.item_description || "",
      amount: expense.amount || "",
      category: expense.category || "other",
      bill_date: expense.bill_date || "",
      payment_method: expense.payment_method || "cash",
      image_url: expense.image_url || "",
      notes: expense.notes || "",
    });
    setEditingId(expense.id);
    setImagePreview(expense.image_url || null);
    setShowForm(true);
  };

  /* ─── Computed Data ────────────────────────────── */
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((exp) => {
      if (!isInDateRange(exp.bill_date, dateFilter)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const searchable = [
          exp.payer_name,
          exp.item_description,
          exp.category,
          exp.notes,
          exp.payment_method,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, dateFilter, search]);

  const stats = useMemo(() => {
    const safeExpenses = expenses || [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const todayExpenses = safeExpenses.filter((e) => e.bill_date === todayStr);
    const todayTotal = todayExpenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0,
    );

    const monthExpenses = safeExpenses.filter((e) => {
      const d = new Date(e.bill_date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const monthTotal = monthExpenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0,
    );

    const filteredTotal = filteredExpenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0,
    );

    const cashTotal = filteredExpenses
      .filter((e) => e.payment_method === "cash")
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const onlineTotal = filteredExpenses
      .filter((e) => e.payment_method === "online")
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const noBillCount = filteredExpenses.filter((e) => !e.image_url).length;

    return {
      todayTotal,
      todayCount: todayExpenses.length,
      monthTotal,
      monthCount: monthExpenses.length,
      filteredTotal,
      filteredCount: filteredExpenses.length,
      cashTotal,
      onlineTotal,
      noBillCount,
    };
  }, [expenses, filteredExpenses]);

  /* ─── Loading skeleton ─────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="card h-20 shimmer rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 shimmer rounded-xl" />
          ))}
        </div>
        <div className="card h-96 shimmer rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      {/* ─── Toast ─────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ─── Image Viewer ──────────────────────────── */}
      {viewImage && (
        <ImageViewer url={viewImage} onClose={() => setViewImage(null)} />
      )}

      {/* ─── Header ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-semibold tracking-tight">
              Expense Tracker
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulseDot" />
              Active
            </span>
          </div>
          <p className="text-mist text-sm mt-1">
            Track daily expenses with bill images, amounts, and CSV export
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => downloadCSV(filteredExpenses)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[.08] bg-white/[.05] text-sm font-medium text-cream hover:bg-white/[.08] transition-all"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={() => {
              setForm({ ...emptyForm });
              setEditingId(null);
              setImagePreview(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_24px_rgba(220,38,38,.3)] transition-all hover:-translate-y-0.5"
          >
            <Icon d={I.plus} className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* ─── Stats Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Expenses"
          value={stats.todayTotal}
          prefix="₹"
          tone="text-brand-300"
          icon={<Icon d={I.bolt} className="w-5 h-5" />}
          sub={`${stats.todayCount} entries today`}
        />
        <StatCard
          label="This Month"
          value={stats.monthTotal}
          prefix="₹"
          tone="text-gold-300"
          icon={<Icon d={I.calendar} className="w-5 h-5" />}
          sub={`${stats.monthCount} entries this month`}
        />
        <StatCard
          label="Cash Payments"
          value={stats.cashTotal}
          prefix="₹"
          tone="text-sky"
          icon={<Icon d={I.dollar} className="w-5 h-5" />}
          sub={`Filtered view total`}
        />
        <StatCard
          label="Online Payments"
          value={stats.onlineTotal}
          prefix="₹"
          tone="text-emerald"
          icon={<Icon d={I.trend} className="w-5 h-5" />}
          sub={`${stats.noBillCount} without bill image`}
        />
      </div>

      {/* ─── Filtered Total Banner ─────────────────── */}
      <div className="card-glass p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-mist uppercase tracking-wider">
              Filtered Total
            </p>
            <p className="text-2xl font-display font-semibold text-cream tabular-nums">
              {formatCurrency(stats.filteredTotal)}
            </p>
          </div>
          <div className="h-10 w-px bg-white/[.08]" />
          <div>
            <p className="text-xs text-mist uppercase tracking-wider">
              Entries
            </p>
            <p className="text-2xl font-display font-semibold text-cream tabular-nums">
              {stats.filteredCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dateFilter === f.value
                  ? "bg-brand/15 text-brand-300 border border-brand/25 shadow-[0_0_12px_rgba(220,38,38,.15)]"
                  : "text-mist border border-white/[.07] hover:bg-white/[.06] hover:text-cream"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Add/Edit Expense Modal ═══════════════════ */}
      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/55 p-4"
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setImagePreview(null);
            }}
          >
            <div
              className="relative card-premium p-4 sm:p-6 w-full max-w-lg space-y-3 animate-rise shadow-lift rounded-2xl max-h-[90vh] overflow-y-auto scroll-thin"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold">
                  {editingId ? "✏️ Edit Expense" : "➕ Add New Expense"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setImagePreview(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream transition-colors"
                >
                  <Icon d={I.x} className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={saveExpense} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider block mb-1">
                      Who bought it? *
                    </span>
                    <input
                      value={form.payer_name}
                      onChange={(e) =>
                        setForm({ ...form, payer_name: e.target.value })
                      }
                      placeholder="e.g. Rahul Kumar"
                      className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider block mb-1">
                      What was bought?
                    </span>
                    <input
                      value={form.item_description}
                      onChange={(e) =>
                        setForm({ ...form, item_description: e.target.value })
                      }
                      placeholder="e.g. Dhol skin, Cable"
                      className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider">
                      Amount (₹) *
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mist text-sm font-medium">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors tabular-nums"
                        required
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider">
                      Category *
                    </span>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider">
                      Bill Date *
                    </span>
                    <input
                      type="date"
                      value={form.bill_date}
                      onChange={(e) =>
                        setForm({ ...form, bill_date: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-mist uppercase tracking-wider">
                      Payment Method *
                    </span>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, payment_method: "cash" })
                        }
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          form.payment_method === "cash"
                            ? "bg-gold/15 text-gold border-gold/30 shadow-[0_0_12px_rgba(245,158,11,.1)]"
                            : "border-white/[.07] text-mist hover:text-cream hover:bg-white/[.04]"
                        }`}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, payment_method: "online" })
                        }
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          form.payment_method === "online"
                            ? "bg-emerald/15 text-emerald border-emerald/30 shadow-[0_0_12px_rgba(52,211,153,.1)]"
                            : "border-white/[.07] text-mist hover:text-cream hover:bg-white/[.04]"
                        }`}
                      >
                        📱 Online
                      </button>
                    </div>
                  </label>
                </div>

                <div>
                  <span className="text-[11px] text-mist uppercase tracking-wider">
                    Bill Image (Optional)
                  </span>
                  <div className="mt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await handleImageUpload(file);
                          if (url) {
                            setImagePreview(url);
                            setForm({ ...form, image_url: url });
                          }
                        }
                      }}
                    />

                    {imagePreview || form.image_url ? (
                      <div className="relative group">
                        <img
                          src={imagePreview || form.image_url}
                          alt="Bill preview"
                          className="w-full max-h-28 sm:max-h-40 object-contain rounded-lg border border-white/[.1] bg-ink-950"
                        />
                        <div className="absolute inset-0 bg-ink-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setForm({ ...form, image_url: "" });
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand/20 text-brand-300 border border-brand/30 text-xs font-medium hover:bg-brand/30 transition-colors"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-cream border border-white/20 text-xs font-medium hover:bg-white/20 transition-colors"
                          >
                            Replace
                          </button>
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 bg-ink-950/70 rounded-lg flex items-center justify-center">
                            <div className="flex items-center gap-2 text-sm text-mist">
                              <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 sm:py-6 rounded-lg border-2 border-dashed border-white/[.1] bg-white/[.02] hover:bg-white/[.04] hover:border-white/[.2] transition-all flex items-center justify-center gap-3 text-mist group"
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] group-hover:bg-white/[.08] transition-colors shrink-0">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="3"
                              y="3"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="text-sm block">
                            Tap to upload bill image
                          </span>
                          <span className="text-[11px] text-ink-500">
                            JPG, PNG, HEIC (max 5MB)
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="text-[11px] text-mist uppercase tracking-wider">
                    Notes (Optional)
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={1}
                    placeholder="Additional details..."
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 resize-none transition-colors"
                  />
                </label>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setImagePreview(null);
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm text-mist hover:text-cream border border-white/[.07] hover:bg-white/[.04] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold disabled:opacity-50 hover:shadow-[0_0_20px_rgba(220,38,38,.25)] transition-all"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : editingId ? (
                      "Update Expense"
                    ) : (
                      "Save Expense"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ═══ Expenses Table ════════════════════════════ */}
      <div className="card-premium overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              Expense History
              <span className="text-xs font-normal text-mist bg-white/[.06] px-2 py-0.5 rounded-full">
                {filteredExpenses.length}
              </span>
            </h2>
            <p className="text-xs text-mist mt-1">
              All expenses with bill images, amounts and categories
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Icon
              d={I.search}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, item, category..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-ink-950/80 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-cream transition-colors"
              >
                <Icon d={I.x} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[.07] bg-ink-950/50">
                <th className="text-left px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Date
                </th>
                <th className="text-left px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Paid By
                </th>
                <th className="text-left px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Item
                </th>
                <th className="text-right px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Category
                </th>
                <th className="text-left px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Payment
                </th>
                <th className="text-center px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Bill
                </th>
                <th className="text-right px-5 py-3 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[.04]">
                        <Icon d={I.dollar} className="w-7 h-7 text-mist" />
                      </div>
                      <p className="text-sm text-mist">
                        {search
                          ? "No expenses match your search"
                          : "No expenses recorded yet"}
                      </p>
                      <button
                        onClick={() => {
                          setForm({ ...emptyForm });
                          setEditingId(null);
                          setShowForm(true);
                        }}
                        className="text-sm text-brand-300 hover:text-brand transition-colors font-medium"
                      >
                        + Add your first expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense, idx) => {
                  const cat = CATEGORY_MAP[expense.category] || {
                    emoji: "📦",
                    label: expense.category || "Other",
                  };
                  const pay =
                    PAYMENT_COLORS[expense.payment_method] ||
                    PAYMENT_COLORS.cash;

                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-white/[.05] hover:bg-white/[.03] transition-colors"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-mono text-xs font-semibold text-cream">
                          {formatDateShort(expense.bill_date)}
                        </p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm text-cream font-medium">
                          {expense.payer_name || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="text-sm text-cream/80 truncate">
                          {expense.item_description || "-"}
                        </p>
                        {expense.notes && (
                          <p className="text-[11px] text-ink-500 truncate mt-0.5">
                            {expense.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <p className="font-mono text-sm font-semibold text-gold-300">
                          {formatCurrency(expense.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-2.5 py-1 text-[11px] text-cream/80">
                          <span>{cat.emoji}</span>
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full border text-[11px] font-semibold ${pay.bg} ${pay.text} ${pay.border}`}
                        >
                          {expense.payment_method === "online"
                            ? "Online"
                            : "Cash"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {expense.image_url ? (
                          <button
                            onClick={() => setViewImage(expense.image_url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-sky bg-sky/10 border border-sky/20 hover:bg-sky/20 transition-all"
                          >
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(expense)}
                            className="p-1.5 rounded-lg text-mist hover:text-sky hover:bg-sky/10 transition-all"
                            title="Edit"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="p-1.5 rounded-lg text-mist hover:text-coral hover:bg-coral/10 transition-all"
                            title="Delete"
                          >
                            <Icon d={I.trash} className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-ink-950/60 border-t border-white/[.08]">
                  <td
                    colSpan={3}
                    className="px-5 py-3.5 text-xs text-mist font-medium uppercase tracking-wider"
                  >
                    Total ({filteredExpenses.length} entries)
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-mono text-sm font-bold text-gold-300">
                      {formatCurrency(stats.filteredTotal)}
                    </span>
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
