import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Icon, I } from "./icons";

const NAV = [
  { icon: I.grid,       label: "Dashboard" },
  { icon: I.calendar,   label: "Attendance" },
  { icon: I.briefcase,  label: "Shifting 1" },
  { icon: I.chart,      label: "Dhol Pan" },
  { icon: I.sliders,    label: "Dhol Maintenance" },
  { icon: I.note,       label: "Daily Report" },
  { icon: I.dollar,     label: "Expenses" },
  { icon: I.users,      label: "New Member Exam" },
  { icon: I.users,      label: "WhatsApp", emoji: "📱" },
];

const ADMIN_NAV = [
  { icon: I.shield, label: "Admin Panel" },
];

/* ── Supabase: signed-in user section with logout ── */
function UserSection({ session, onLogout }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName = session?.user?.user_metadata?.full_name
    || session?.user?.email?.split("@")[0]
    || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName.substring(0, 2).toUpperCase();

  const onLogoutClick = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await onLogout?.();
  };

  return (
    <div className="space-y-2">
      {/* User info row */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/12 to-brand/5 text-xs font-bold text-brand ring-1 ring-brand/20 shadow-inner">
          {initials}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-white" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-cream">{userName}</p>
          <p className="truncate text-[10px] text-mist">{userEmail}</p>
        </div>
      </div>
      {/* Logout button */}
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={onLogoutClick}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-all duration-200 hover:bg-rose-100 hover:text-rose-800 active:scale-95 disabled:opacity-50 cursor-pointer group"
      >
        <Icon d={I.logout} className={`h-4 w-4 transition-transform ${isLoggingOut ? "animate-spin" : "group-hover:translate-x-0.5"}`} />
        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
      </button>
    </div>
  );
}

const Item = ({ icon, label, active, badge, onClick, accent, emoji }) => (
  <button
    onClick={() => onClick?.(label)}
    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200
    ${active
      ? accent === "admin"
        ? "bg-gradient-to-r from-amber-50 via-white to-transparent text-amber-900 border border-amber-200 shadow-[0_2px_12px_rgba(200,135,25,0.12)]"
        : "bg-gradient-to-r from-brand/10 via-white to-transparent text-brand border border-brand/20 shadow-[0_2px_12px_rgba(227,27,35,0.12)]"
      : "text-slate-600 border border-transparent hover:translate-x-1 hover:bg-white hover:text-cream hover:shadow-sm"}`}
  >
    {active && (
      <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accent === "admin" ? "bg-amber-500 shadow-[0_0_12px_rgba(200,135,25,0.35)]" : "bg-brand shadow-[0_0_12px_rgba(227,27,35,0.35)]"}`} />
    )}
    {emoji
      ? <span className="relative text-base">{emoji}</span>
      : <Icon d={icon} className={`relative h-4 w-4 transition-colors ${active ? (accent === "admin" ? "text-amber-600" : "text-brand") : "text-slate-500 group-hover:text-brand"}`} />}
    <span className="relative truncate">{label}</span>
    {label === "WhatsApp" && (
      <span className="relative ml-auto h-2 w-2 rounded-full bg-emerald shadow-[0_0_8px_rgba(5,150,105,0.45)] animate-pulse" title="WhatsApp Center" />
    )}
    {badge && label !== "WhatsApp" && (
      <span className="relative ml-auto rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold border border-gold/20">
        {badge}
      </span>
    )}
  </button>
);

function SidebarContent({ session, activePage, onNavigate, onClose, onLogout }) {
  const handleNav = (label) => {
    onNavigate?.(label);
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Premium Integrated Logo & Header Bar */}
      <div className="relative shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-rose-50/40 p-3 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
        <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-brand/10 blur-xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-brand/12 blur-md" />
              <img
                src="/taal-pathak-logo-red.png"
                alt="TAAL Logo"
                className="relative h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display text-base font-bold tracking-tight text-cream">TAAL</p>
                <span className="rounded-full bg-brand/10 px-1.5 py-[1px] text-[9px] font-bold text-brand uppercase tracking-widest border border-brand/20">
                  CRM
                </span>
              </div>
              <p className="truncate text-[10px] uppercase tracking-[.18em] text-mist font-medium">
                Operations Suite
              </p>
            </div>
          </div>

          {/* Close Button (Integrated on Mobile) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.06] text-mist transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.35)] active:scale-90 group"
              aria-label="Close menu"
            >
              <Icon d={I.x} className="h-5 w-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Nav Area */}
      <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 scroll-thin">
        {/* Workspace section */}
        <div>
          <p className="mb-2 px-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-semibold text-slate-500">
            <span className="h-px w-3 bg-slate-300" />
            Workspace
          </p>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <Item key={n.label} {...n} active={activePage === n.label} onClick={handleNav} />
            ))}
          </nav>
        </div>

        {/* Administration section */}
        <div>
          <p className="mb-2 px-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-semibold text-amber-700">
            <span className="h-px w-3 bg-amber-300" />
            Administration
          </p>
          <nav className="space-y-1">
            {ADMIN_NAV.map((n) => (
              <Item key={n.label} {...n} accent="admin" active={activePage === n.label} onClick={handleNav} />
            ))}
          </nav>
        </div>
      </div>

      {/* User / Auth section fixed at bottom */}
      <div className="shrink-0 pt-3 border-t border-slate-200">
        <UserSection session={session} onLogout={onLogout} />
      </div>
    </div>
  );
}

export default function Sidebar({ session, activePage, onNavigate, mobileOpen, onClose, onLogout }) {
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-[8px_0_32px_rgba(15,23,42,.08)] backdrop-blur-2xl">
        <SidebarContent
          session={session}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-md transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[310px] max-w-[85vw] flex-col border-r border-slate-200 bg-white/95 p-4 shadow-[16px_0_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          session={session}
          activePage={activePage}
          onNavigate={onNavigate}
          onClose={onClose}
          onLogout={onLogout}
        />
      </aside>
    </>
  );
}
