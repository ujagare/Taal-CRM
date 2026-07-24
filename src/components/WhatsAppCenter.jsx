import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { checkWhatsAppStatus, sendBulkWhatsApp, personalizeMessage } from "../utils/whatsapp";

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
  if (status === null) return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
      Checking WhatsApp server...
    </div>
  );
  if (status === true) return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      🤖 WhatsApp Server: Connected — Ready to send messages!
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-amber-400" />
      ⚠️ WhatsApp Server: Offline — Open a new terminal and run: <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300 ml-1">npm run whatsapp</code>
    </div>
  );
}

/* ─── Recipient Card ─── */
function RecipientCard({ member }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 transition-all">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-xs shrink-0">
        {(member.full_name || "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{member.full_name}</p>
        <p className="text-[10px] text-white/40">{member.whatsapp || "No number"}</p>
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
        member.exam_status === "passed"  ? "bg-emerald-500/20 text-emerald-400" :
        member.exam_status === "failed"  ? "bg-red-500/20 text-red-400" :
        "bg-amber-500/20 text-amber-400"
      }`}>
        {(member.exam_status || "pending").toUpperCase()}
      </span>
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
      <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/15">
        <p className="text-xs text-blue-300 font-medium">ℹ️ Auto-triggers tab automatically fire karte hain jab CRM me specific event hota hai. WhatsApp server connected hona chahiye.</p>
      </div>
      {triggers.map((t, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/4 border border-white/8">
          <span className="text-xl shrink-0">{t.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{t.event}</p>
            <p className="text-[11px] text-white/50 mt-0.5">→ {t.action}</p>
            <p className="text-[10px] text-white/30 mt-1">📍 {t.where}</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium shrink-0">
            ✅ Active
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
  const [showPreview, setShowPreview] = useState(false);
  const progressTimer = useRef(null);

  // Admin phone for auto-trigger alerts
  const [adminPhone, setAdminPhone] = useState(() => localStorage.getItem("wa_admin_phone") || "");
  const [adminPhoneSaved, setAdminPhoneSaved] = useState(false);

  // Load WA status
  useEffect(() => {
    checkWhatsAppStatus().then(s => setWaStatus(s.connected));
    const interval = setInterval(() => {
      checkWhatsAppStatus().then(s => setWaStatus(s.connected));
    }, 15000);
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
    return members.filter(m => m.whatsapp); // custom = all with number
  })();

  // Preview message with first recipient
  const previewMsg = recipients.length > 0 ? personalizeMessage(message, recipients[0]) : message;

  // When group changes, load the default template
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

    // Estimate time: 1.5s per message
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
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-2xl shadow-lg shadow-emerald-950/40">
          📱
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Center</h1>
          <p className="text-sm text-white/50 mt-0.5">Bulk broadcast, auto-triggers aur notification system</p>
        </div>
        <div className="ml-auto">
          <StatusBanner status={waStatus} />
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
        {[
          { id: "broadcast", label: "📢 Bulk Broadcast" },
          { id: "triggers",  label: "⚡ Auto-Triggers" },
          { id: "settings",  label: "⚙️ Settings" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BROADCAST TAB ─── */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left: Composer */}
          <div className="space-y-4">
            {/* Step 1: Choose Group */}
            <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-3">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Step 1 · Recipient Group Chuno</p>
              <div className="grid grid-cols-1 gap-2">
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        isActive ? `${c.activeBg} ${c.border} ${c.text}` : "bg-white/3 border-white/8 text-white/60 hover:bg-white/6"
                      }`}>
                      <span className="font-semibold text-sm flex-1">{g.label}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isActive ? `${c.bg} ${c.text}` : "bg-white/10 text-white/40"}`}>
                        {loadingMembers ? "…" : count} recipients
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Compose Message */}
            <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-3">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Step 2 · Apna Message Likho</p>
              <p className="text-[10px] text-white/30">Placeholders: message me auto-replace hote hain har recipient ke liye</p>
              <div className="flex flex-wrap gap-1.5">
                {["{name}", "{status}", "{score}", "{instrument}"].map(ph => (
                  <button key={ph} onClick={() => insertPlaceholder(ph)}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[11px] font-mono font-semibold hover:bg-blue-500/25 transition-all">
                    {ph}
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed"
                style={{ backgroundColor: '#111114', color: '#ffffff' }}
                placeholder="Apna message yahan likho..."
              />
              <p className="text-[10px] text-white/25 text-right">{message.length} characters</p>
            </div>
          </div>

          {/* Right: Preview + Send */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-3">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Step 3 · Preview (First Recipient)</p>
              {recipients.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-white/40">
                    <span>Preview for:</span>
                    <span className="text-white/70 font-medium">{recipients[0].full_name}</span>
                    <span className="text-white/30">({recipients[0].whatsapp})</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a1930] border border-blue-500/15">
                    <pre className="text-sm text-white/85 whitespace-pre-wrap font-sans leading-relaxed">{previewMsg}</pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/4 text-center">
                  <p className="text-sm text-white/30">Is group me koi member nahi hai ya WhatsApp number nahi hai</p>
                </div>
              )}
            </div>

            {/* Recipients List */}
            <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  Recipients ({recipients.length})
                </p>
                <button onClick={() => setShowPreview(!showPreview)}
                  className="text-[10px] text-white/40 hover:text-white/70 transition-all">
                  {showPreview ? "Hide" : "Show all"}
                </button>
              </div>
              <div className={`space-y-1.5 overflow-y-auto ${showPreview ? "max-h-64" : "max-h-32"} transition-all`}>
                {loadingMembers ? (
                  <p className="text-sm text-white/30 text-center py-4">Loading members...</p>
                ) : recipients.length === 0 ? (
                  <p className="text-sm text-white/30 text-center py-4">Koi recipients nahi mili is group me</p>
                ) : (
                  recipients.map(m => <RecipientCard key={m.id} member={m} />)
                )}
              </div>
            </div>

            {/* Send Button */}
            <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-4">
              {/* Progress bar */}
              {sending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-white/50">
                    <span>Sending messages...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/30 text-center">
                    Ek-ek karke message bhej raha hoon, please wait...
                  </p>
                </div>
              )}

              {/* Result */}
              {sendResult && !sending && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                  sendResult.success
                    ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
                    : "bg-amber-500/15 border border-amber-500/25 text-amber-400"
                }`}>
                  {sendResult.success
                    ? `✅ ${sendResult.count} recipients ko messages bhejne ke liye queue hua! Terminal me progress dekho.`
                    : `⚠️ Server offline hai. WhatsApp server start karo: npm run whatsapp`}
                </div>
              )}

              <button
                onClick={handleSendBulk}
                disabled={sending || recipients.length === 0 || !message.trim() || waStatus === false}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending
                  ? `🤖 Sending to ${recipients.length}...`
                  : waStatus === false
                  ? `⚠️ Server Offline — Start karo pehle`
                  : `🚀 Send to All ${recipients.length} Recipients`}
              </button>
              {waStatus !== false && recipients.length === 0 && (
                <p className="text-[10px] text-white/30 text-center">Is group me WhatsApp number wale members nahi hain</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── AUTO TRIGGERS TAB ─── */}
      {activeTab === "triggers" && <AutoTriggersTab />}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="space-y-4 max-w-lg">
          <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-4">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Admin Phone Number</p>
            <p className="text-xs text-white/40">
              Dori low stock aur Daily Report auto-alerts is number par jayenge.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                placeholder="Admin ka WhatsApp number (10 digits)"
                className="flex-1 px-3 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-all"
                style={{ backgroundColor: '#111114' }}
              />
              <button
                onClick={saveAdminPhone}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-all"
              >
                {adminPhoneSaved ? "✅ Saved!" : "Save"}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/4 border border-white/10 space-y-3">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">WhatsApp Server Start Kaise Karo</p>
            <div className="space-y-2">
              {[
                { step: "1", desc: "VS Code me nayi terminal kholo (Ctrl + Shift + `)" },
                { step: "2", desc: "Run karo:", code: "npm run whatsapp" },
                { step: "3", desc: "Terminal me QR Code aayega" },
                { step: "4", desc: "Mobile WhatsApp → Linked Devices → QR Scan karo" },
                { step: "5", desc: "Connected! Ab CRM auto messages bhejega 🎉" },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                  <div>
                    <p className="text-sm text-white/70">{s.desc}</p>
                    {s.code && <code className="text-xs text-emerald-400 font-mono bg-black/30 px-2 py-1 rounded mt-1 inline-block">{s.code}</code>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
