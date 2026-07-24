import { useCallback, useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

const LOCAL_STORAGE_KEY = "taal_local_shifting_assets_v1";

// Hardcoded fallback data — used when Supabase table is empty / unreachable
const FALLBACK_ASSETS = [
  { id: 1, item: '२६" पाने', qty: "7 पाने", custodian: "संकेत दादा", category: "पाने (Blades)", location: "संकेत दादा" },
  { id: 2, item: '२८" पाने', qty: "थापी = 39 | धूम = 51", custodian: "संकेत दादा", category: "पाने (Blades)", location: "संकेत दादा" },
  { id: 3, item: '३०" पाने', qty: "थापी = 08 | धूम = 09", custodian: "संकेत दादा", category: "पाने (Blades)", location: "संकेत दादा" },
  { id: 4, item: "ढोलाची दोरी", qty: "47 नग", custodian: "संकेत दादा", category: "दोरी (Ropes)", location: "संकेत दादा" },
  { id: 5, item: "टोलचे बोड", qty: "4 नग (1 Semi Circle)", custodian: "कात्रज", category: "टोल (Tol)", location: "कात्रज" },
  { id: 6, item: "टोलचे गाडे", qty: "3 नग (1 Wide) Army", custodian: "कात्रज", category: "टोल (Tol)", location: "कात्रज" },
  { id: 7, item: "टोलचे पाते", qty: "1 नग", custodian: "कात्रज", category: "टोल (Tol)", location: "कात्रज" },
  { id: 8, item: "झालर Crazy Cheezy", qty: "43 नग", custodian: "कात्रज", category: "सजावट (Decoration)", location: "कात्रज" },
  { id: 9, item: "ढोलाचे कव्हर", qty: "145 नग", custodian: "कात्रज", category: "कव्हर (Covers)", location: "कात्रज" },
  { id: 10, item: "झाँज २१ जोड", qty: "1 (बिना मूठ)", custodian: "कात्रज", category: "वाद्य (Instruments)", location: "कात्रज" },
  { id: 11, item: "वायर + छोटे हॅलोजन", qty: "1 पोती + 3 हॅलोजन (जुने खराब)", custodian: "कात्रज", category: "इलेक्ट्रिकल", location: "कात्रज" },
  { id: 12, item: "कड्या", qty: "35 नग", custodian: "कात्रज", category: "साहित्य (Hardware)", location: "कात्रज" },
  { id: 13, item: "स्क्रॅपर + टोचा + हातोडा", qty: "प्रत्येकी 2 नग", custodian: "कात्रज", category: "अवजारे (Tools)", location: "कात्रज" },
  { id: 14, item: "मेन छोटा बॉक्स", qty: "1 नग", custodian: "कात्रज", category: "इलेक्ट्रिकल", location: "कात्रज" },
  { id: 15, item: "ध्वजाचे पाईप", qty: "6 नग", custodian: "कात्रज", category: "ध्वज (Flags)", location: "कात्रज" },
  { id: 16, item: "लाकडी फळ्या", qty: "4 नग", custodian: "कात्रज", category: "साहित्य (Hardware)", location: "कात्रज" },
  { id: 17, item: "पॅकिंग रॅपर", qty: "1 नग", custodian: "कात्रज", category: "पॅकिंग", location: "कात्रज" },
  { id: 18, item: "घुंगरू", qty: "1 छोटा पोती", custodian: "कात्रज", category: "वाद्य (Instruments)", location: "कात्रज" },
  { id: 19, item: "Blue Crate मोठा", qty: "1 (Extension Rope)", custodian: "कात्रज", category: "स्टोरेज", location: "कात्रज" },
  { id: 20, item: "छत्री Crazy Cheesy + स्टँडी", qty: "प्रत्येकी 1 नग", custodian: "पवन", category: "इव्हेंट साहित्य", location: "कात्रज", note: '२८" पाने १० धूम / १० थापी / १० दोरी इव्हेंट करीता कात्रज ला ठेवली आहे' },
];

const EMPTY_FORM = { item: "", qty: "", custodian: "", category: "", location: "", note: "" };

/* ─── Animated Counter Component ────────────────────── */
function AnimatedValue({ value, suffix = "" }) {
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
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ─── High-Definition White PDF Generator ───────────────── */
async function downloadPDF(assets) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateTimeStr = `${dateStr}, ${timeStr}`;

  const totalQuantity = assets.reduce((sum, a) => {
    const nums = (a.qty || "").match(/\d+/g);
    return sum + (nums ? nums.reduce((s, n) => s + Number(n), 0) : 0);
  }, 0);

  const custodiansCount = new Set(assets.map((a) => a.custodian).filter(Boolean)).size;

  // Create temporary container for HTML rendering matching the user's white template screenshot
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:0;top:0;z-index:-9999;opacity:0.01;pointer-events:none;width:800px;background:#FFF;color:#111827;font-family:Outfit,system-ui,sans-serif;padding:40px 32px;box-sizing:border-box;";

  container.innerHTML = `
    <div style="background: #FFFFFF; font-family: Outfit, system-ui, -apple-system, sans-serif;">
      <!-- Logo Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <img
          src="/taal-pathak-logo-red.png"
          alt="TAAL Logo"
          style="height: 75px; width: auto; margin: 0 auto 12px auto; display: block;"
        />
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
          Shifting 1 Assets Inventory Report
        </h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #6B7280; font-weight: 500;">
          Generated: ${dateTimeStr}
        </p>
      </div>

      <!-- 3 Stat Cards Row -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px;">
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-size: 12px; color: #6B7280; font-weight: 600;">Total Items</div>
          <div style="font-size: 32px; font-weight: 700; color: #111827; margin-top: 6px;">${assets.length}</div>
        </div>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-size: 12px; color: #6B7280; font-weight: 600;">Custodians</div>
          <div style="font-size: 32px; font-weight: 700; color: #111827; margin-top: 6px;">${custodiansCount}</div>
        </div>

        <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-size: 12px; color: #DC2626; font-weight: 600;">Grand Total Quantity</div>
          <div style="font-size: 32px; font-weight: 700; color: #DC2626; margin-top: 6px;">${totalQuantity}+</div>
        </div>
      </div>

      <!-- Clean White Grid Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; border: 1px solid #E5E7EB;">
        <thead>
          <tr style="background: #111827; color: #FFFFFF;">
            <th style="padding: 12px 10px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #111827; width: 40px;">#</th>
            <th style="padding: 12px 12px; text-align: left; font-size: 11px; font-weight: 700; border: 1px solid #111827;">Item / तपशील</th>
            <th style="padding: 12px 12px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #111827;">Qty / संख्या</th>
            <th style="padding: 12px 12px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #111827;">Custodian / पालक</th>
            <th style="padding: 12px 12px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #111827;">Category</th>
            <th style="padding: 12px 12px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #111827;">Location</th>
          </tr>
        </thead>
        <tbody>
          ${assets
            .map((a, idx) => {
              return `
                <tr style="background: #FFFFFF; border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 11px 10px; text-align: center; color: #6B7280; font-weight: 600; border: 1px solid #E5E7EB;">${idx + 1}</td>
                  <td style="padding: 11px 12px; text-align: left; color: #111827; font-weight: 700; border: 1px solid #E5E7EB;">
                    ${a.item || "-"}
                    ${a.note ? `<div style="font-size: 10px; color: #D97706; margin-top: 3px; font-weight: 500;">⚠️ ${a.note}</div>` : ""}
                  </td>
                  <td style="padding: 11px 12px; text-align: center; color: #374151; font-weight: 600; border: 1px solid #E5E7EB;">${a.qty || "-"}</td>
                  <td style="padding: 11px 12px; text-align: center; color: #111827; font-weight: 600; border: 1px solid #E5E7EB;">${a.custodian || "-"}</td>
                  <td style="padding: 11px 12px; text-align: center; color: #4B5563; border: 1px solid #E5E7EB;">${a.category || "-"}</td>
                  <td style="padding: 11px 12px; text-align: center; color: #4B5563; border: 1px solid #E5E7EB;">${a.location || "-"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>

      <!-- Footer Signature -->
      <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9CA3AF;">
        <div>TAAL PATHAK Operations CRM — Official Inventory Document</div>
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

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#FFFFFF",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`TAAL_Shifting1_Assets_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("PDF generation error:", err);
  } finally {
    document.body.removeChild(container);
  }
}

/* ─── Skeleton Loading ───────────────────────────────── */
const Skeleton = () => (
  <div className="space-y-5 animate-rise">
    <div className="card h-40 shimmer rounded-xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card h-28 shimmer rounded-xl" />
      ))}
    </div>
    <div className="card h-14 shimmer rounded-xl" />
    <div className="card h-96 shimmer rounded-xl" />
  </div>
);

/* ─── Modal for Add / Edit ───────────────────────────── */
function AssetModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState(
    mode === "edit" ? { ...initial } : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item.trim() || !form.qty.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative card-premium p-6 w-full max-w-lg space-y-4 animate-rise shadow-lift max-h-[92vh] overflow-y-auto scroll-thin">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold">
            {mode === "add" ? "✨ Add New Asset" : "✏️ Edit Asset"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] bg-white/[.04] text-mist hover:text-cream transition-colors"
          >
            <Icon d={I.x} className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider">
              Item Name / तपशील *
            </span>
            <input
              value={form.item}
              onChange={set("item")}
              placeholder='e.g. २६" पाने, ढोलाची दोरी'
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider">
              Quantity / संख्या *
            </span>
            <input
              value={form.qty}
              onChange={set("qty")}
              placeholder="e.g. 7 पाने, 47 नग"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-mist uppercase tracking-wider">
                Custodian / पालक
              </span>
              <input
                value={form.custodian}
                onChange={set("custodian")}
                placeholder="e.g. संकेत दादा, कात्रज"
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mist uppercase tracking-wider">
                Location / ठिकाण
              </span>
              <input
                value={form.location}
                onChange={set("location")}
                placeholder="e.g. कात्रज"
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider">
              Category
            </span>
            <input
              value={form.category}
              onChange={set("category")}
              placeholder="e.g. पाने (Blades), दोरी, वाद्य"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-xs text-mist uppercase tracking-wider">
              Note (Optional)
            </span>
            <textarea
              value={form.note || ""}
              onChange={set("note")}
              rows={2}
              placeholder="Additional information or remarks..."
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 resize-none transition-colors"
            />
          </label>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm text-mist hover:text-cream border border-white/[.07] hover:bg-white/[.04] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(220,38,38,.25)] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : mode === "add" ? "Add Asset" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ──────────────────────── */
function DeleteConfirm({ item, onDelete, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative card-premium p-6 w-full max-w-sm space-y-4 animate-rise shadow-lift text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-coral/10 border border-coral/25 grid place-items-center text-coral text-xl">
          <Icon d={I.trash} className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-cream text-lg">
            Delete Asset?
          </h3>
          <p className="text-sm text-mist mt-1 break-words">{item}</p>
          <p className="text-xs text-coral mt-2">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 justify-center pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-mist hover:text-cream border border-white/[.07] hover:bg-white/[.04] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
            disabled={deleting}
            className="px-5 py-2 rounded-lg bg-coral text-white text-sm font-semibold hover:bg-coral/80 disabled:opacity-50 transition-all shadow-[0_0_16px_rgba(239,68,68,.25)]"
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast Component ────────────────────────────────── */
function Toast({ msg, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium bg-emerald/15 text-emerald border border-emerald/25 shadow-lift backdrop-blur-xl animate-rise">
      <span>✓</span>
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <Icon d={I.x} className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — Shifting1
   ═══════════════════════════════════════════════════ */
export default function Shifting1() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterCust, setFilterCust] = useState("All");
  const [selected, setSelected] = useState(null);

  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
  };

  /* ─── Load Data with Fallback ─────────────────── */
  const loadAssets = useCallback(async () => {
    setLoading(true);
    let loadedData = [];
    let isFallback = false;

    try {
      const { data, error } = await supabase
        .from("taal_assets")
        .select("*")
        .order("id");

      if (!error && Array.isArray(data) && data.length > 0) {
        loadedData = data;
      } else if (data && data.length === 0) {
        loadedData = [];
      } else {
        throw new Error("Supabase table empty or error");
      }
    } catch (err) {
      console.warn("Supabase assets fetch fallback:", err);
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
        if (local && local.length > 0) {
          loadedData = local;
        } else {
          loadedData = FALLBACK_ASSETS;
          isFallback = true;
        }
      } catch {
        loadedData = FALLBACK_ASSETS;
        isFallback = true;
      }
    }

    setAssets(loadedData);
    setUsingFallback(isFallback);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedData));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  /* ─── CRUD Functions ──────────────────────────── */
  const addAsset = async (form) => {
    const itemPayload = {
      item: form.item.trim(),
      qty: form.qty.trim(),
      custodian: form.custodian.trim() || "कात्रज",
      category: form.category.trim() || "साहित्य",
      location: form.location.trim() || "कात्रज",
      note: form.note.trim() || null,
    };

    let remoteSaved = false;
    let newItem = { ...itemPayload, id: Date.now() };

    try {
      const { data, error } = await supabase
        .from("taal_assets")
        .insert(itemPayload)
        .select("*")
        .single();

      if (!error && data) {
        newItem = data;
        remoteSaved = true;
      }
    } catch (err) {
      console.warn("Supabase insert error, saving locally:", err);
    }

    setAssets((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    notify(remoteSaved ? "Asset added to cloud!" : "Asset saved locally!");
    setModal(null);
  };

  const editAsset = async (form) => {
    const updates = {
      item: form.item.trim(),
      qty: form.qty.trim(),
      custodian: form.custodian.trim(),
      category: form.category.trim(),
      location: form.location.trim(),
      note: form.note.trim() || null,
    };

    try {
      await supabase.from("taal_assets").update(updates).eq("id", form.id);
    } catch (err) {
      console.warn("Supabase update error:", err);
    }

    setAssets((prev) => {
      const updated = prev.map((a) => (a.id === form.id ? { ...a, ...updates } : a));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    notify("Asset updated!");
    setModal(null);
  };

  const deleteAsset = async (id) => {
    try {
      await supabase.from("taal_assets").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete error:", err);
    }

    setAssets((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setDel(null);
    setSelected(null);
    notify("Asset deleted!");
  };

  /* ─── Computed Properties ─────────────────────── */
  const CATEGORIES = useMemo(
    () => [...new Set(assets.map((a) => a.category).filter(Boolean))],
    [assets]
  );
  const CUSTODIANS = useMemo(
    () => [...new Set(assets.map((a) => a.custodian).filter(Boolean))],
    [assets]
  );

  const totalQuantity = useMemo(() => {
    return assets.reduce((sum, a) => {
      const nums = (a.qty || "").match(/\d+/g);
      return sum + (nums ? nums.reduce((s, n) => s + Number(n), 0) : 0);
    }, 0);
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (a.item || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.custodian || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q);

      const matchCat = filterCat === "All" || a.category === filterCat;
      const matchCust = filterCust === "All" || a.custodian === filterCust;

      return matchSearch && matchCat && matchCust;
    });
  }, [assets, search, filterCat, filterCust]);

  if (loading) return <Skeleton />;

  const pillColor = (c) =>
    c === "संकेत दादा"
      ? "bg-gold/10 text-gold border border-gold/25"
      : c === "कात्रज"
      ? "bg-sky/10 text-sky border border-sky/25"
      : "bg-brand/10 text-brand-300 border border-brand/25";

  return (
    <div className="space-y-5 animate-rise">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ─── Hero Header ───────────────────────────── */}
      <section className="dashboard-hero overflow-hidden rounded-xl border border-white/[.08] bg-ink-900/90 shadow-premium-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-5 sm:p-7 gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulseDot" />
                Shifting 1 — Assets Inventory
              </span>
              {usingFallback && (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
                  Local Mode
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-cream">
              ढोल-ताशा पथकाचे साहित्याची नोंद
            </h1>
            <p className="mt-2 text-sm text-mist max-w-xl">
              Track and manage all TAAL pathak assets, hardware, ropes, blades, and equipment with live custodian locations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => downloadPDF(filtered)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[.08] bg-white/[.05] text-sm font-semibold text-cream hover:bg-white/[.08] transition-all shadow-card"
            >
              <svg className="w-4 h-4 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={() => setModal({ mode: "add" })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-300 text-white text-sm font-semibold hover:shadow-[0_0_24px_rgba(220,38,38,.3)] transition-all hover:-translate-y-0.5"
            >
              <Icon d={I.plus} className="w-4 h-4" />
              Add Asset
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stat Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium relative min-h-[120px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Total Items</p>
              <p className="mt-2 font-display text-3xl font-semibold text-cream tabular-nums">
                <AnimatedValue value={assets.length} />
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-gold-300">
              <Icon d={I.briefcase} className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2.5 text-xs text-mist">Registered inventory items</p>
        </div>

        <div className="card-premium relative min-h-[120px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Total Quantity</p>
              <p className="mt-2 font-display text-3xl font-semibold text-sky tabular-nums">
                <AnimatedValue value={totalQuantity} suffix="+" />
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-sky">
              <Icon d={I.chart} className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2.5 text-xs text-mist">Total estimated units count</p>
        </div>

        <div className="card-premium relative min-h-[120px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Categories</p>
              <p className="mt-2 font-display text-3xl font-semibold text-emerald tabular-nums">
                <AnimatedValue value={CATEGORIES.length} />
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-emerald">
              <Icon d={I.sliders} className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2.5 text-xs text-mist">Distinct asset categories</p>
        </div>

        <div className="card-premium relative min-h-[120px] overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-mist">Custodians</p>
              <p className="mt-2 font-display text-3xl font-semibold text-brand-300 tabular-nums">
                <AnimatedValue value={CUSTODIANS.length} />
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-brand-300">
              <Icon d={I.users} className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2.5 text-xs text-mist">Locations & custodians</p>
        </div>
      </div>

      {/* ─── Search & Filters Bar ───────────────────── */}
      <div className="card-glass p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Icon
            d={I.search}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist"
          />
          <input
            type="text"
            placeholder="Search assets by name, category, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-lg bg-ink-950/80 border border-white/[.07] text-sm text-cream placeholder:text-ink-500 focus:outline-none focus:border-brand/50 transition-colors"
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

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterCust}
            onChange={(e) => setFilterCust(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-ink-950 border border-white/[.07] text-sm text-cream focus:outline-none focus:border-brand/50 transition-colors"
          >
            <option value="All">All Custodians</option>
            {CUSTODIANS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="text-xs text-mist pl-2 whitespace-nowrap">
            Showing <strong className="text-cream font-semibold">{filtered.length}</strong> of {assets.length}
          </span>
        </div>
      </div>

      {/* ─── Table (Desktop) ────────────────────────── */}
      <div className="card-premium overflow-hidden hidden sm:block">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[.07] bg-ink-950/50">
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium w-14">
                  #
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Item / तपशील
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Qty / संख्या
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Custodian / पालक
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Category
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium">
                  Location
                </th>
                <th className="text-right px-5 py-3.5 text-[11px] text-mist uppercase tracking-[.14em] font-medium w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-mist">
                    <div className="flex flex-col items-center gap-2">
                      <Icon d={I.briefcase} className="w-8 h-8 opacity-40" />
                      <p>No assets found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((a, idx) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(selected === a.id ? null : a.id)}
                    className={`border-b border-white/[.05] transition-colors cursor-pointer hover:bg-white/[.03] ${
                      selected === a.id ? "bg-brand/10" : ""
                    }`}
                  >
                    <td className="px-5 py-4 text-mist font-mono text-xs">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-cream">{a.item}</p>
                      {a.note && (
                        <p className="text-[11px] text-gold-300 mt-0.5 truncate max-w-xs">
                          ⚠️ {a.note}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-cream/90 font-mono text-xs">
                      {a.qty}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${pillColor(
                          a.custodian
                        )}`}
                      >
                        {a.custodian}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-mist">
                      <span className="rounded-full bg-white/[.05] px-2.5 py-1 text-cream/80 border border-white/[.06]">
                        {a.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-mist">
                      {a.location}
                    </td>
                    <td
                      className="px-5 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: "edit", data: a })}
                          className="p-1.5 rounded-lg text-mist hover:text-sky hover:bg-sky/10 transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDel(a)}
                          className="p-1.5 rounded-lg text-mist hover:text-coral hover:bg-coral/10 transition-all"
                          title="Delete"
                        >
                          <Icon d={I.trash} className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Cards (Mobile) ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filtered.map((a, idx) => (
          <div
            key={a.id}
            onClick={() => setSelected(selected === a.id ? null : a.id)}
            className={`card-premium p-4 space-y-3 transition-colors cursor-pointer ${
              selected === a.id ? "ring-1 ring-brand/40" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-mist font-mono">
                #{String(idx + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${pillColor(
                  a.custodian
                )}`}
              >
                {a.custodian}
              </span>
            </div>
            <p className="font-semibold text-cream">{a.item}</p>
            <div className="flex items-center gap-3 text-xs text-mist">
              <span className="font-mono text-cream/90 font-medium">
                Qty: {a.qty}
              </span>
              <span>•</span>
              <span>{a.category}</span>
            </div>
            {a.note && selected === a.id && (
              <p className="text-xs text-gold-300 bg-gold/10 border border-gold/20 rounded-lg p-2">
                ⚠️ {a.note}
              </p>
            )}
            {selected === a.id && (
              <div
                className="flex gap-2 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setModal({ mode: "edit", data: a })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky/10 border border-sky/25 text-sky text-xs font-semibold hover:bg-sky/20 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDel(a)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-coral/10 border border-coral/25 text-coral text-xs font-semibold hover:bg-coral/20 transition-all"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Selected Item Note Banner ──────────────── */}
      {selected && (
        <div className="card-glass p-4 animate-rise hidden sm:block">
          {(() => {
            const a = assets.find((x) => x.id === selected);
            return a?.note ? (
              <div className="flex items-start gap-3">
                <span className="text-gold-300 mt-0.5 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-gold-300">
                    Note for {a.item}
                  </p>
                  <p className="text-sm text-mist mt-1">{a.note}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-mist">
                Selected: <strong className="text-cream">{a?.item}</strong> ({a?.qty}) — No additional notes.
              </p>
            );
          })()}
        </div>
      )}

      {/* ─── Custodian Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CUSTODIANS.map((cust) => {
          const items = assets.filter((a) => a.custodian === cust);
          const totalQty = items.reduce((sum, a) => {
            const nums = (a.qty || "").match(/\d+/g);
            return sum + (nums ? nums.reduce((s, n) => s + Number(n), 0) : 0);
          }, 0);

          return (
            <div key={cust} className="card-premium p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${pillColor(cust)}`}>
                  {cust}
                </span>
                <span className="text-xs text-mist font-mono">{items.length} items</span>
              </div>
              <div>
                <p className="text-2xl font-display font-semibold text-cream tabular-nums">
                  <AnimatedValue value={totalQty} suffix="+" />
                </p>
                <p className="text-xs text-mist mt-0.5">Estimated total units</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {items.slice(0, 4).map((a) => (
                  <span
                    key={a.id}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/[.05] text-mist border border-white/[.06] truncate max-w-[130px]"
                    title={a.item}
                  >
                    {a.item}
                  </span>
                ))}
                {items.length > 4 && (
                  <span className="text-[11px] text-mist font-semibold">
                    +{items.length - 4} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Modals ─────────────────────────────────── */}
      {modal && (
        <AssetModal
          mode={modal.mode}
          initial={modal.data}
          onSave={modal.mode === "add" ? addAsset : editAsset}
          onClose={() => setModal(null)}
        />
      )}
      {del && (
        <DeleteConfirm
          item={del.item}
          onDelete={() => deleteAsset(del.id)}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}
