import { useEffect, useState } from "react";
import { Icon, I } from "./icons";

const NAV = [
  { icon: I.grid,       label: "Dashboard" },
  { icon: I.calendar,   label: "Attendance" },
  { icon: I.briefcase,  label: "Shifting 1" },
  { icon: I.chart,      label: "Dhol Pan" },
  { icon: I.sliders,    label: "Dhol Maintenance" },
  { icon: I.note,       label: "Daily Report" },
  { icon: I.dollar,     label: "Expenses" },
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
    <div className="space-y-2.5 pt-2">
      {/* User info card */}
      <div className="
        flex items-center gap-3 p-2.5 rounded-2xl
        bg-gradient-to-r from-white to-slate-50/80
        border border-slate-200/80 shadow-sm
        hover:border-slate-300 transition-all duration-200
      ">
        <div className="
          relative grid h-10 w-10 shrink-0 place-items-center rounded-xl
          bg-gradient-to-br from-red-500 to-rose-600
          text-xs font-bold force-text-white
          shadow-md shadow-red-500/25
        ">
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
        </div>
        <div className="min-w-0 leading-tight flex-1">
          <p className="truncate text-xs font-bold text-slate-800">{userName}</p>
          <p className="truncate text-[10px] text-slate-400 font-medium mt-0.5">{userEmail}</p>
        </div>
      </div>

      {/* Logout button */}
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={onLogoutClick}
        className="
          flex w-full items-center justify-center gap-2 rounded-xl
          border border-rose-200/80 bg-gradient-to-r from-rose-50 to-red-50
          px-3.5 py-2.5 text-xs font-bold text-rose-700
          hover:from-rose-100 hover:to-red-100 hover:text-rose-800 hover:border-rose-300
          active:scale-98 transition-all duration-200
          disabled:opacity-50 cursor-pointer group shadow-sm
        "
      >
        <Icon d={I.logout} className={`h-4 w-4 transition-transform ${isLoggingOut ? "animate-spin" : "group-hover:-translate-x-0.5"}`} />
        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
      </button>
    </div>
  );
}

const Item = ({ icon, label, active, badge, onClick, accent, emoji }) => {
  const isAdmin = accent === "admin";
  return (
    <button
      onClick={() => onClick?.(label)}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold
        transition-all duration-200 cursor-pointer
        ${active
          ? isAdmin
            ? "bg-gradient-to-r from-amber-500/15 via-amber-50/60 to-white text-amber-900 border border-amber-300/80 shadow-md shadow-amber-500/10"
            : "bg-gradient-to-r from-red-500/15 via-rose-50/60 to-white text-red-700 border border-red-300/80 shadow-md shadow-red-500/10"
          : "text-slate-600 border border-transparent hover:bg-slate-100/60 hover:text-slate-900 hover:translate-x-1"
        }
      `}
    >
      {active && (
        <span
          className={`
            absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full
            ${isAdmin ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-red-600 shadow-[0_0_8px_rgba(227,27,35,0.6)]"}
          `}
        />
      )}
      {emoji ? (
        <span className="relative text-base shrink-0">{emoji}</span>
      ) : (
        <Icon
          d={icon}
          className={`
            relative h-4 w-4 shrink-0 transition-colors duration-200
            ${active
              ? isAdmin ? "text-amber-600" : "text-red-600"
              : "text-slate-400 group-hover:text-red-600"
            }
          `}
        />
      )}
      <span className="relative truncate flex-1 text-left">{label}</span>

      {label === "WhatsApp" && (
        <span className="relative ml-auto flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}

      {badge && label !== "WhatsApp" && (
        <span className="
          relative ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold
          bg-amber-50 text-amber-700 border border-amber-200
        ">
          {badge}
        </span>
      )}
    </button>
  );
};

function SidebarContent({ session, activePage, onNavigate, onClose, onLogout }) {
  const handleNav = (label) => {
    onNavigate?.(label);
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Integrated Logo & Header Bar */}
      <div className="
        relative shrink-0 overflow-hidden rounded-2xl
        border border-slate-200/80
        bg-gradient-to-br from-white via-slate-50/60 to-rose-50/40
        p-3.5 shadow-md shadow-slate-200/50 backdrop-blur-xl
      ">
        <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-red-500/10 blur-xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-red-500/20 blur-md" />
              <img
                src="/taal-pathak-logo-red.png"
                alt="TAAL Logo"
                className="relative h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display text-base font-bold tracking-tight text-slate-900">TAAL</p>
                <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold text-red-600 uppercase tracking-widest border border-red-200">
                  CRM
                </span>
              </div>
              <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold mt-0.5">
                Operations Suite
              </p>
            </div>
          </div>

          {/* Close Button on Mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="
                lg:hidden relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                border border-slate-200 bg-white text-slate-500
                hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700
                active:scale-90 transition-all duration-200 cursor-pointer group
              "
              aria-label="Close menu"
            >
              <Icon d={I.x} className="h-5 w-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-5 scroll-thin">
        {/* Workspace Section */}
        <div>
          <p className="mb-2 px-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">
            <span className="h-px w-3 bg-slate-300" />
            Workspace
          </p>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <Item key={n.label} {...n} active={activePage === n.label} onClick={handleNav} />
            ))}
          </nav>
        </div>

        {/* Administration Section */}
        <div>
          <p className="mb-2 px-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-amber-700">
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

      {/* User Profile & Logout at Bottom */}
      <div className="shrink-0 pt-3 border-t border-slate-200/80">
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
      <aside className="
        hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col
        border-r border-slate-200/80 bg-white/90 px-4 py-5
        shadow-[4px_0_24px_rgba(15,23,42,0.05)] backdrop-blur-2xl
      ">
        <SidebarContent
          session={session}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm
          transition-opacity duration-300 lg:hidden
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[310px] max-w-[85vw] flex-col
          border-r border-slate-200 bg-white/95 p-4
          shadow-[16px_0_50px_rgba(15,23,42,0.15)] backdrop-blur-2xl
          transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
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
