import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { checkWhatsAppStatus, sendBulkWhatsApp, personalizeMessage, sendWhatsApp } from "../utils/whatsapp";

/* ─── Default message templates ─── */
const TEMPLATES = {
  passed: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n✅ निकाल: *PASSED*\n🏆 गुण: *{score}*\n\nअभिनंदन! तुम्ही आमच्या पथकात निवडलात.\nपुढील सूचनेसाठी संपर्कात राहा. 🥁\n\nधन्यवाद!`,
  failed: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ परीक्षा निकाल:\n\n❌ निकाल: *FAILED*\n\nया वेळी तुम्ही पास होऊ शकला नाहीत.\nपुढच्या वर्षी नक्की प्रयत्न करा! 🥁\n\nधन्यवाद!`,
  pending: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ —\n\nतुमची परीक्षा प्रलंबित आहे.\nलवकरच परीक्षेसाठी संपर्क केला जाईल.\n\nधन्यवाद! 🥁`,
  all: `जय गणेश! 🙏 प्रिय *{name}*,\n\nताल वाद्यपथक गणेशोत्सव २०२६ मध्ये सहभागी झाल्याबद्दल धन्यवाद!\n\nपुढील सूचनेसाठी संपर्कात राहा. 🥁`,
  custom: `जय गणेश! 🙏 प्रिय *{name}*,\n\nइकडे आपला संदेश लिहा...`,
};

const GROUP_OPTIONS = [
  { id: "passed",  label: "✅ Passed Members",  color: "emerald" },
  { id: "failed",  label: "❌ Failed Members",  color: "red"     },
  { id: "pending", label: "⏳ Pending Members", color: "amber"   },
  { id: "all",     label: "👥 All New Members", color: "blue"    },
  { id: "custom",  label: "✏️ Custom Selection", color: "purple"  },
];

const colorMap = {
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", activeBg: "bg-emerald-500/25" },
  red:     { bg: "bg-red-500/15",     border: "border-red-500/30",     text: "text-red-400",     activeBg: "bg-red-500/25"     },
  amber:   { bg: "bg-amber-500/15",   border: "border-amber-500/30",   text: "text-amber-400",   activeBg: "bg-amber-500/25"   },
  blue:    { bg: "bg-blue-500/15",    border: "border-blue-500/30",    text: "text-blue-400",    activeBg: "bg-blue-500/25"    },
  purple:  { bg: "bg-purple-500/15",  border: "border-purple-500/30",  text: "text-purple-400",  activeBg: "bg-purple-500/25"  },
};

/* ─── Server Status Banner ─── */
function StatusBanner({ status }) {
  if (status === true) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span>Connected ✅</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
      <span>Server Offline ⚠️</span>
    </div>
  );
}

/* ─── Recipient Card ─── */
function RecipientCard({ member, customMsg }) {
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
      // Direct Web link fallback
      const url = `https://wa.me/91${member.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msgText)}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
          {(member.full_name || "?")[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{member.full_name}</p>
          <p className="text-[10px] text-white/50">{member.whatsapp || "No Phone"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          member.exam_status === "passed"  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
          member.exam_status === "failed"  ? "bg-red-500/20 text-red-400 border border-red-500/30" :
          "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        }`}>
          {(member.exam_status || "pending").toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleSendSingle}
          disabled={sendingOne}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 shadow"
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
    { icon: "🆕", event: "Naya Member Register hua", action: "Member ko registration confirmation message", where: "New Member form submit", status: "active" },
    { icon: "✅", event: "Exam Passed Save hua", action: "Candidate ko PASSED result message", where: "New Member Exam → Save Changes", status: "active" },
    { icon: "❌", event: "Exam Failed Save hua", action: "Candidate ko FAILED result message", where: "New Member Exam → Save Changes", status: "active" },
    { icon: "📦", event: "Dori Stock 10 se kam hua", action: "Admin ko low stock alert (Admin number chahiye)", where: "Dhol Pan → Dori Update", status: "active" },
    { icon: "📊", event: "Daily Report Submit hua", action: "Admin ko report summary notification", where: "Daily Report → Save", status: "active" },
  ];
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300 font-medium">ℹ️ Auto-triggers tab automatically fire karte hain jab CRM me specific event hota hai. WhatsApp server connected hona chahiye.</p>
      </div>
      {triggers.map((t, i) => (
        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xl shrink-0">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">{t.event}</p>
            <p className="text-[11px] text-white/60 mt-0.5">→ {t.action}</p>
            <p className="text-[10px] text-white/30 mt-1">📍 {t.where}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium shrink-0">
            Active
          </span>
        </div>
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
  const [sendResult, setSendResult] = useState(null); // { success, count }
  const [progress, setProgress] = useState(0); // 0-100
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
    localStorage.setItem("wa_admin_phone", adminPhone);
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24">
      {/* ─── Page Header (Responsive) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xl shadow-lg shadow-emerald-950/40 shrink-0">
            📱
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">WhatsApp Center</h1>
            <p className="text-xs text-white/50">Bulk Broadcast & Auto Notifications</p>
          </div>
        </div>
        <StatusBanner status={waStatus} />
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-fit overflow-x-auto">
        {[
          { id: "broadcast", label: "📢 Bulk Send" },
          { id: "triggers",  label: "⚡ Auto Triggers" },
          { id: "settings",  label: "⚙️ Settings" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-md"
                : "text-white/50 hover:text-white"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BROADCAST TAB ─── */}
      {activeTab === "broadcast" && (
        <div className="space-y-4">
          
          {/* Main Actions Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* LEFT COLUMN: Group & Message Editor (Col 7) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Step 1: Choose Group */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">1. Target Group</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {recipients.length} candidates
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GROUP_OPTIONS.map(g => {
                    const c = colorMap[g.color];
                    const isActive = selectedGroup === g.id;
                    const count = (() => {
                      if (g.id === "all")     return members.filter(m => m.whatsapp).length;
                      if (g.id === "passed")  return members.filter(m => m.whatsapp && m.exam_status === "passed").length;
                      if (g.id === "failed")  return members.filter(m => m.whatsapp && m.exam_status === "failed").length;
                      if (g.id === "pending") return members.filter(m => m.whatsapp && (!m.exam_status || m.exam_status === "pending")).length;
                      return members.filter(m => m.whatsapp).length;
                    })();
                    return (
                      <button key={g.id} onClick={() => handleGroupChange(g.id)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border transition-all ${
                          isActive ? `${c.activeBg} ${c.border} ${c.text} ring-1 ring-emerald-500/40` : "bg-white/3 border-white/8 text-white/60 hover:bg-white/6"
                        }`}>
                        <span className="font-bold text-xs truncate w-full">{g.label}</span>
                        <span className="text-[10px] text-white/40 mt-1 font-mono">{count} members</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Message Composer */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">2. Message Editor</p>
                  <span className="text-[10px] text-white/40">Click tags to add</span>
                </div>
                
                {/* Placeholders */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: "{name}", label: "+ Name" },
                    { tag: "{status}", label: "+ Status" },
                    { tag: "{score}", label: "+ Score" },
                    { tag: "{instrument}", label: "+ Instrument" },
                  ].map(({ tag, label }) => (
                    <button key={tag} onClick={() => insertPlaceholder(tag)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition-all">
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3.5 py-3 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-all leading-relaxed"
                  style={{ backgroundColor: '#121216', color: '#ffffff' }}
                  placeholder="Apna message yahan type karein..."
                />
                
                {/* Immediate Prominent Send Button for Mobile/Desktop */}
                <button
                  type="button"
                  onClick={handleSendBulk}
                  disabled={sending || recipients.length === 0 || !message.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white font-bold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/50 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">🚀</span>
                  <span>{sending ? `Sending (${Math.round(progress)}%)...` : `Send WhatsApp to All (${recipients.length})`}</span>
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Preview & Individual Recipient Actions (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Message Preview Box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">3. Live Message Preview</p>
                {recipients.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#091526] border border-blue-500/20 space-y-2">
                    <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">
                      Preview for: {recipients[0].full_name}
                    </p>
                    <pre className="text-xs text-white/90 whitespace-pre-wrap font-sans leading-relaxed">{previewMsg}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-white/40 text-center py-4">Is group me koi WhatsApp candidates nahi hain</p>
                )}
              </div>

              {/* Recipient List with 1-Click Send per candidate */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Candidates List ({recipients.length})
                  </p>
                </div>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {loadingMembers ? (
                    <p className="text-xs text-white/40 text-center py-4">Loading list...</p>
                  ) : recipients.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-4">Koi candidate nahi mila</p>
                  ) : (
                    recipients.map(m => <RecipientCard key={m.id} member={m} customMsg={message} />)
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Progress / Status Alert */}
          {sending && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 space-y-2 shadow-xl">
              <div className="flex justify-between text-xs font-bold text-emerald-300">
                <span>Sending WhatsApp Messages...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-white/60 text-center">Background me messages deliver ho rahe hain, kripya window na band karein.</p>
            </div>
          )}

          {sendResult && !sending && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold ${
              sendResult.success
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300"
            }`}>
              {sendResult.success
                ? `✅ ${sendResult.count} candidates ko WhatsApp messages successfully bheje gaye!`
                : `⚠️ WhatsApp server se message nahi bheja ja saka. Terminal check karein.`}
            </div>
          )}

        </div>
      )}

      {/* ─── AUTO TRIGGERS TAB ─── */}
      {activeTab === "triggers" && <AutoTriggersTab />}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="space-y-4 max-w-lg">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Admin WhatsApp Number</p>
            <p className="text-xs text-white/50">
              Dori low stock aur Daily Reports auto-alerts is number par receive honge.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                placeholder="Admin WhatsApp Number (10 digits)"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                style={{ backgroundColor: '#121216' }}
              />
              <button
                onClick={saveAdminPhone}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all shrink-0"
              >
                {adminPhoneSaved ? "Saved! ✅" : "Save"}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">WhatsApp Server Status Guide</p>
            <div className="space-y-2 text-xs text-white/70">
              <p>1. Terminal window me <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded">npm run whatsapp</code> chalao.</p>
              <p>2. WhatsApp → Linked Devices → Scan QR code.</p>
              <p>3. Status <b>Connected ✅</b> aane ke baad automatic & bulk messages kaam karenge.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
