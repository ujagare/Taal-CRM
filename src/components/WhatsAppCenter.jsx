import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { checkWhatsAppStatus, sendBulkWhatsApp, personalizeMessage, sendWhatsApp, saveAdminPhones } from "../utils/whatsapp";

/* ─── Default message templates ─── */
const TEMPLATES = {
  passed: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n✅ निकाल: *PASSED*\n🏆 गुण: *{score}*\n\nअभिनंदन! तुम्ही आमच्या पथकात निवडलात.\nपुढील सूचनेसाठी संपर्कात राहा. 🥁\n\nधन्यवाद!`,
  failed: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n❌ निकाल: *FAILED*\n\nया वेळी तुम्ही पास होऊ शकला नाहीत.\nपुढच्या वर्षी नक्की प्रयत्न करा! 🥁\n\nधन्यवाद!`,
  pending: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ —\n\nतुमची परीक्षा प्रलंबित आहे.\nलवकरच परीक्षेसाठी संपर्क केला जाईल.\n\nधन्यवाद! 🥁`,
  all: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ मध्ये सहभागी झाल्याबद्दल धन्यवाद!\n\nपुढील सूचनेसाठी संपर्कात राहा. 🥁`,
  custom: `जय गणेश! 🙏 प्रिय *{name}*,\n\nइकडे आपला संदेश लिहा...`,
};

const GROUP_OPTIONS = [
  { id: "passed",  label: "Passed",    icon: "✅", color: "emerald" },
  { id: "failed",  label: "Failed",    icon: "❌", color: "red"     },
  { id: "pending", label: "Pending",   icon: "⏳", color: "amber"   },
  { id: "all",     label: "All",       icon: "👥", color: "blue"    },
  { id: "custom",  label: "Custom",    icon: "✏️", color: "purple"  },
];

/* ─── Glassmorphism card wrapper ─── */
function GlassCard({ children, className = "", hover = true, noPadding = false }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/80 backdrop-blur-xl
      border border-slate-200/60
      shadow-[0_4px_24px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]
      ${hover ? "hover:shadow-[0_8px_40px_rgba(15,23,42,0.10),0_2px_4px_rgba(15,23,42,0.06)] hover:border-slate-300/80 transition-all duration-300 ease-out" : ""}
      ${noPadding ? "" : "p-5"}
      ${className}
    `}>
      {children}
    </div>
  );
}

/* ─── Animated section label ─── */
function SectionLabel({ step, label, count, icon }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {step && (
          <span className="
            w-6 h-6 rounded-lg
            bg-gradient-to-br from-emerald-500 to-teal-600
            flex items-center justify-center
            text-[10px] font-bold
            shadow-sm shadow-emerald-500/30
          " style={{ color: '#ffffff' }}>{step}</span>
        )}
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
      </div>
      {count !== undefined && (
        <span className="
          text-[11px] font-semibold px-2.5 py-1 rounded-full
          bg-emerald-50 text-emerald-700 border border-emerald-200/60
        ">
          {count} candidates
        </span>
      )}
    </div>
  );
}

/* ─── Server Status Banner ─── */
function StatusBanner({ status }) {
  if (status === true) return (
    <div className="
      flex items-center gap-2 px-3.5 py-2 rounded-xl
      bg-gradient-to-r from-emerald-50 to-teal-50
      border border-emerald-200/60
      shadow-sm shadow-emerald-100/50
      wa-status-enter
    ">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-400/50" />
      </span>
      <span className="text-xs font-semibold text-emerald-700">Connected</span>
      <span className="text-sm">✅</span>
    </div>
  );
  return (
    <div className="
      flex items-center gap-2 px-3.5 py-2 rounded-xl
      bg-gradient-to-r from-amber-50 to-orange-50
      border border-amber-200/60
      shadow-sm shadow-amber-100/50
      wa-status-enter
    ">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-400/50" />
      <span className="text-xs font-semibold text-amber-700">Server Offline</span>
      <span className="text-sm">⚠️</span>
    </div>
  );
}

/* ─── Recipient Card ─── */
function RecipientCard({ member, customMsg, index }) {
  const [sent, setSent] = useState(false);
  const [sendingOne, setSendingOne] = useState(false);

  const handleSendSingle = async () => {
    if (!member.whatsapp) return;
    setSendingOne(true);
    const msgText = personalizeMessage(customMsg, member);
    const ok = await sendWhatsApp(member.whatsapp, msgText);
    setSendingOne(false);
    if (ok) {
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } else {
      const url = `https://wa.me/91${member.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msgText)}`;
      window.open(url, "_blank");
    }
  };

  const statusColors = {
    passed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    failed: "bg-red-50 text-red-700 border-red-200/80",
    pending: "bg-amber-50 text-amber-700 border-amber-200/80",
  };

  return (
    <div
      className="
        group flex items-center justify-between gap-3 p-3 rounded-xl
        bg-white/60 border border-slate-100
        hover:bg-white hover:border-slate-200 hover:shadow-sm
        transition-all duration-200 ease-out
        wa-card-enter
      "
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="
          w-9 h-9 rounded-xl
          bg-gradient-to-br from-emerald-500 to-teal-600
          flex items-center justify-center
          font-bold text-xs shrink-0
          shadow-sm shadow-emerald-500/25
          group-hover:shadow-md group-hover:shadow-emerald-500/30
          transition-shadow duration-200
        " style={{ color: '#ffffff' }}>
          {(member.full_name || "?")[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{member.full_name}</p>
          <p className="text-[11px] text-slate-400 font-medium">{member.whatsapp || "No Phone"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`
          text-[9px] font-bold px-2 py-0.5 rounded-full border
          ${statusColors[member.exam_status] || statusColors.pending}
        `}>
          {(member.exam_status || "pending").toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleSendSingle}
          disabled={sendingOne}
          className={`
            px-3 py-1.5 rounded-lg text-[11px] font-semibold
            transition-all duration-200 flex items-center gap-1
            active:scale-95 shadow-sm cursor-pointer
            ${sent
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/30"
            }
          `}
          style={!sent ? { color: '#ffffff' } : {}}
        >
          {sent ? "✅ Sent!" : sendingOne ? "..." : "💬 Send"}
        </button>
      </div>
    </div>
  );
}

/* ─── Auto Triggers Info Tab ─── */
function AutoTriggersTab() {
  const triggers = [
    { icon: "📦", event: "Dori Stock 10 se kam hua", action: "Admin ko low stock alert", where: "Dhol Pan → Dori Update", status: "active" },
    { icon: "📊", event: "Daily Report Submit hua", action: "Admin ko report summary notification", where: "Daily Report → Save", status: "active" },
  ];
  return (
    <div className="space-y-3 wa-fade-in">
      <GlassCard className="!p-4 !bg-gradient-to-r !from-blue-50/80 !to-indigo-50/80 !border-blue-200/50">
        <div className="flex items-start gap-2.5">
          <span className="text-lg mt-0.5">ℹ️</span>
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Auto-triggers automatically fire when specific events occur in the CRM. WhatsApp server must be connected.
          </p>
        </div>
      </GlassCard>
      {triggers.map((t, i) => (
        <GlassCard key={i} className="wa-card-enter" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
          <div className="flex items-start gap-3.5">
            <div className="
              w-10 h-10 rounded-xl
              bg-gradient-to-br from-blue-100 to-indigo-100
              border border-blue-200/50
              flex items-center justify-center text-xl shrink-0
            ">{t.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{t.event}</p>
              <p className="text-xs text-slate-500 mt-0.5">→ {t.action}</p>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                {t.where}
              </p>
            </div>
            <span className="
              text-[10px] px-2.5 py-1 rounded-full font-semibold
              bg-emerald-50 text-emerald-700 border border-emerald-200/60
              shrink-0
            ">
              Active ✓
            </span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ─── Main WhatsApp Center ─── */
export default function WhatsAppCenter() {
  const [activeTab, setActiveTab] = useState("broadcast");
  const [waStatus, setWaStatus] = useState(null);

  // Members data
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Broadcast state
  const [selectedGroup, setSelectedGroup] = useState("passed");
  const [message, setMessage] = useState(TEMPLATES["passed"]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  // Admin phone for auto-trigger alerts
  const [adminPhone, setAdminPhone] = useState(() => localStorage.getItem("wa_admin_phone") || "");
  const [adminPhoneSaved, setAdminPhoneSaved] = useState(false);

  // Load WA status
  useEffect(() => {
    checkWhatsAppStatus().then(s => setWaStatus(s.connected));
    const interval = setInterval(() => {
      checkWhatsAppStatus().then(s => setWaStatus(s.connected));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load members
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const { data } = await supabase.from("new_members").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) setMembers(data);
    } catch { /* ignore */ }
    setLoadingMembers(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Compute recipients based on group
  const recipients = (() => {
    if (selectedGroup === "all")     return members.filter(m => m.whatsapp);
    if (selectedGroup === "passed")  return members.filter(m => m.whatsapp && m.exam_status === "passed");
    if (selectedGroup === "failed")  return members.filter(m => m.whatsapp && m.exam_status === "failed");
    if (selectedGroup === "pending") return members.filter(m => m.whatsapp && (!m.exam_status || m.exam_status === "pending"));
    return members.filter(m => m.whatsapp);
  })();

  // Preview message with first recipient
  const previewMsg = recipients.length > 0 ? personalizeMessage(message, recipients[0]) : message;

  // When group changes, load default template
  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    setMessage(TEMPLATES[groupId] || TEMPLATES.all);
    setSendResult(null);
    setProgress(0);
  };

  // Insert placeholder at cursor
  const textareaRef = useRef(null);
  const insertPlaceholder = (ph) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newMsg = message.slice(0, start) + ph + message.slice(end);
    setMessage(newMsg);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + ph.length, start + ph.length);
    }, 0);
  };

  // Save admin phone
  const saveAdminPhone = () => {
    saveAdminPhones(adminPhone);
    setAdminPhoneSaved(true);
    setTimeout(() => setAdminPhoneSaved(false), 2000);
  };

  // Send bulk
  const handleSendBulk = async () => {
    if (recipients.length === 0 || !message.trim()) return;
    setSending(true);
    setSendResult(null);
    setProgress(0);

    const totalMs = recipients.length * 1500;
    const step = 100 / (totalMs / 200);
    progressTimer.current = setInterval(() => {
      setProgress(p => {
        if (p >= 95) {
          clearInterval(progressTimer.current);
          return 95;
        }
        return Math.min(95, p + step);
      });
    }, 200);

    const ok = await sendBulkWhatsApp(recipients, message);

    clearInterval(progressTimer.current);
    setProgress(100);

    setTimeout(() => {
      setSendResult({ success: ok, count: recipients.length });
      setSending(false);
      setProgress(0);
    }, 600);
  };

  const getGroupCount = (groupId) => {
    if (groupId === "all") return members.filter(m => m.whatsapp).length;
    if (groupId === "passed") return members.filter(m => m.whatsapp && m.exam_status === "passed").length;
    if (groupId === "failed") return members.filter(m => m.whatsapp && m.exam_status === "failed").length;
    if (groupId === "pending") return members.filter(m => m.whatsapp && (!m.exam_status || m.exam_status === "pending")).length;
    return members.filter(m => m.whatsapp).length;
  };

  const groupActiveStyles = {
    emerald: "!bg-gradient-to-br !from-emerald-50 !to-teal-50 !border-emerald-300 ring-2 ring-emerald-200/50",
    red: "!bg-gradient-to-br !from-red-50 !to-rose-50 !border-red-300 ring-2 ring-red-200/50",
    amber: "!bg-gradient-to-br !from-amber-50 !to-orange-50 !border-amber-300 ring-2 ring-amber-200/50",
    blue: "!bg-gradient-to-br !from-blue-50 !to-indigo-50 !border-blue-300 ring-2 ring-blue-200/50",
    purple: "!bg-gradient-to-br !from-purple-50 !to-violet-50 !border-purple-300 ring-2 ring-purple-200/50",
  };

  const groupTextColors = {
    emerald: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
  };

  const TABS = [
    { id: "broadcast", label: "Bulk Send", icon: "📢" },
    { id: "triggers",  label: "Auto Triggers", icon: "⚡" },
    { id: "settings",  label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-28 wa-fade-in">

      {/* ─── Page Header ─── */}
      <GlassCard className="!p-0 !bg-gradient-to-r from-white/90 via-emerald-50/30 to-teal-50/30" hover={false}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="
              w-12 h-12 rounded-2xl
              bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700
              flex items-center justify-center text-2xl
              shadow-lg shadow-emerald-500/25
              wa-icon-float
            ">
              📱
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">WhatsApp Center</h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Bulk Broadcast & Auto Notifications</p>
            </div>
          </div>
          <StatusBanner status={waStatus} />
        </div>
        {/* decorative bottom bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      </GlassCard>

      {/* ─── Tabs Navigation ─── */}
      <div className="flex gap-1 p-1.5 rounded-2xl bg-white/70 backdrop-blur-lg border border-slate-200/60 shadow-sm w-full sm:w-fit overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold
              transition-all duration-250 whitespace-nowrap cursor-pointer
              ${activeTab === tab.id
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
              }
            `}
            style={activeTab === tab.id ? { color: '#ffffff' } : undefined}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BROADCAST TAB ─── */}
      {activeTab === "broadcast" && (
        <div className="space-y-5 wa-fade-in">

          {/* Main 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* ──── LEFT: Group + Message Editor ──── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Step 1: Target Group */}
              <GlassCard>
                <SectionLabel step="1" label="Target Group" count={recipients.length} />
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                  {GROUP_OPTIONS.map(g => {
                    const isActive = selectedGroup === g.id;
                    const count = getGroupCount(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleGroupChange(g.id)}
                        className={`
                          relative flex flex-col items-center p-3 rounded-xl border
                          transition-all duration-250 cursor-pointer
                          ${isActive
                            ? groupActiveStyles[g.color]
                            : "bg-white/60 border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                          }
                        `}
                      >
                        <span className="text-xl mb-1">{g.icon}</span>
                        <span className={`font-bold text-[11px] ${isActive ? groupTextColors[g.color] : "text-slate-600"}`}>
                          {g.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{count}</span>
                        {isActive && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Step 2: Message Editor */}
              <GlassCard>
                <SectionLabel step="2" label="Message Editor" />

                {/* Placeholder tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { tag: "{name}", label: "Name", icon: "👤" },
                    { tag: "{status}", label: "Status", icon: "📋" },
                    { tag: "{score}", label: "Score", icon: "🏆" },
                    { tag: "{instrument}", label: "Instrument", icon: "🥁" },
                  ].map(({ tag, label, icon }) => (
                    <button key={tag} onClick={() => insertPlaceholder(tag)}
                      className="
                        px-3 py-1.5 rounded-lg
                        bg-slate-100/80 border border-slate-200/60
                        text-slate-600 text-[11px] font-semibold
                        hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700
                        active:scale-95 transition-all duration-200 cursor-pointer
                      ">
                      <span className="mr-1">{icon}</span>
                      + {label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={7}
                  className="
                    w-full px-4 py-3.5 rounded-xl
                    bg-slate-50/80 border border-slate-200/80
                    text-sm text-slate-800
                    placeholder:text-slate-400
                    focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
                    transition-all duration-200 leading-relaxed resize-none
                    scroll-thin
                  "
                  placeholder="Apna message yahan type karein..."
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={handleSendBulk}
                  disabled={sending || recipients.length === 0 || !message.trim()}
                  className="
                    w-full mt-3 py-3.5 px-5 rounded-xl
                    bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600
                    font-bold text-sm
                    hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500
                    transition-all duration-300
                    shadow-lg shadow-emerald-500/25
                    hover:shadow-xl hover:shadow-emerald-500/35
                    active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                    flex items-center justify-center gap-2.5 cursor-pointer
                    wa-btn-glow
                  "
                  style={{ color: '#ffffff' }}
                >
                  <span className="text-lg" style={{ color: '#ffffff' }}>{sending ? "⏳" : "🚀"}</span>
                  <span>{sending ? `Sending (${Math.round(progress)}%)...` : `Send WhatsApp to All (${recipients.length})`}</span>
                </button>
              </GlassCard>
            </div>

            {/* ──── RIGHT: Preview + Recipients ──── */}
            <div className="lg:col-span-5 space-y-5">

              {/* Live Preview */}
              <GlassCard>
                <SectionLabel step="3" label="Live Preview" icon="👁️" />
                {recipients.length > 0 ? (
                  <div className="
                    relative p-4 rounded-xl overflow-hidden
                    bg-gradient-to-br from-slate-50 to-emerald-50/30
                    border border-slate-200/60
                  ">
                    {/* Decorative WhatsApp-style top bar */}
                    <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-200/60">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ color: '#ffffff' }}>
                        {recipients[0].full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">{recipients[0].full_name}</p>
                        <p className="text-[9px] text-slate-400">Preview Message</p>
                      </div>
                    </div>
                    {/* Message bubble */}
                    <div className="
                      relative p-3.5 rounded-xl rounded-tl-sm
                      bg-white border border-slate-200/60
                      shadow-sm
                    ">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{previewMsg}</pre>
                      <div className="text-[9px] text-slate-400 text-right mt-2 font-medium">
                        Preview ✓✓
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <span className="text-3xl mb-2 opacity-40">💬</span>
                    <p className="text-xs font-medium">No WhatsApp candidates in this group</p>
                  </div>
                )}
              </GlassCard>

              {/* Recipients List */}
              <GlassCard>
                <SectionLabel icon="📋" label={`Candidates (${recipients.length})`} />
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scroll-thin">
                  {loadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3" />
                      <p className="text-xs text-slate-400 font-medium">Loading members...</p>
                    </div>
                  ) : recipients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <span className="text-3xl mb-2 opacity-40">👥</span>
                      <p className="text-xs font-medium">No candidates found</p>
                    </div>
                  ) : (
                    recipients.map((m, i) => <RecipientCard key={m.id} member={m} customMsg={message} index={i} />)
                  )}
                </div>
              </GlassCard>
            </div>

          </div>

          {/* Progress Alert */}
          {sending && (
            <GlassCard
              hover={false}
              className="!bg-gradient-to-r !from-emerald-50/90 !to-teal-50/90 !border-emerald-300/60 wa-fade-in"
            >
              <div className="flex justify-between text-xs font-bold text-emerald-700 mb-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sending WhatsApp Messages...
                </span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-emerald-100/80 overflow-hidden border border-emerald-200/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-300 wa-progress-shine"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-600/80 text-center mt-2 font-medium">
                Messages deliver ho rahe hain, kripya window na band karein.
              </p>
            </GlassCard>
          )}

          {sendResult && !sending && (
            <GlassCard
              hover={false}
              className={`
                wa-fade-in
                ${sendResult.success
                  ? "!bg-gradient-to-r !from-emerald-50/90 !to-teal-50/90 !border-emerald-300/60"
                  : "!bg-gradient-to-r !from-amber-50/90 !to-orange-50/90 !border-amber-300/60"
                }
              `}
            >
              <p className={`text-sm font-semibold ${sendResult.success ? "text-emerald-700" : "text-amber-700"}`}>
                {sendResult.success
                  ? `✅ ${sendResult.count} candidates ko WhatsApp messages successfully bheje gaye!`
                  : `⚠️ WhatsApp server se message nahi bheja ja saka. Terminal check karein.`}
              </p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ─── AUTO TRIGGERS TAB ─── */}
      {activeTab === "triggers" && <AutoTriggersTab />}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="space-y-5 max-w-lg wa-fade-in">
          <GlassCard>
            <SectionLabel icon="📞" label="Admin WhatsApp Number" />
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Dori low stock aur Daily Reports auto-alerts is number par receive honge.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                placeholder="Admin WhatsApp Number (10 digits)"
                className="
                  flex-1 px-4 py-2.5 rounded-xl
                  bg-slate-50/80 border border-slate-200/80
                  text-sm text-slate-800 placeholder:text-slate-400
                  focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
                  transition-all duration-200
                "
              />
              <button
                onClick={saveAdminPhone}
                className="
                  px-5 py-2.5 rounded-xl
                  bg-gradient-to-r from-emerald-500 to-teal-600
                  text-xs font-bold
                  hover:from-emerald-400 hover:to-teal-500
                  transition-all duration-200 shrink-0 cursor-pointer
                  shadow-sm shadow-emerald-500/20
                  active:scale-95
                "
                style={{ color: '#ffffff' }}
              >
                {adminPhoneSaved ? "Saved! ✅" : "Save"}
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <SectionLabel icon="📖" label="Server Setup Guide" />
            <div className="space-y-3 text-sm text-slate-600">
              {[
                { step: "1", text: <>Terminal me <code className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-mono border border-emerald-100">npm run whatsapp</code> chalao.</> },
                { step: "2", text: "WhatsApp → Linked Devices → Scan QR code." },
                { step: "3", text: <>Status <strong className="text-emerald-700">Connected ✅</strong> aane ke baad automatic & bulk messages kaam karenge.</> },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="
                    w-6 h-6 rounded-lg mt-0.5
                    bg-gradient-to-br from-slate-100 to-slate-200
                    border border-slate-200/60
                    flex items-center justify-center
                    text-[10px] font-bold text-slate-500 shrink-0
                  ">{step}</span>
                  <p className="text-xs leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
