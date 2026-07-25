import { useEffect } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { useAuthLogger } from "../hooks/useAuthLogger";
import { Icon, I } from "./icons";

const NAV = [
  { icon: I.grid,       label: "Dashboard" },
  { icon: I.calendar,   label: "Attendance" },
  { icon: I.briefcase,  label: "Shifting 1" },
  { icon: I.chart,      label: "Dhol Pan" },
  { icon: I.sliders,    label: "Dhol Maintenance" },
  { icon: I.note,       label: "Daily Report" },
  { icon: I.dollar,     label: "Expences" },
  { icon: I.users,      label: "New Member Exam" },
  { icon: I.users,      label: "WhatsApp", emoji: "📱" },
];

const ADMIN_NAV = [
  { icon: I.shield, label: "Admin Panel" },
];

/* ── Clerk: signed-in user section with logout ── */
function ClerkUserSection() {
  const { isSignedIn, user } = useUser();
  const { handleLogout } = useAuthLogger();

  return isSignedIn ? (
    <div className="space-y-2">
      {/* User info row */}
      <div className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.04] p-2.5 backdrop-blur-md">
        <UserButton />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-cream">{user.fullName}</p>
          <p className="truncate text-[10px] text-mist">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 transition-all duration-200 hover:bg-rose-500/20 hover:text-rose-300 group"
      >
        <Icon d={I.logout} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        <span>Logout</span>
      </button>
    </div>
  ) : (
    <div className="flex gap-2 w-full">
      <SignInButton mode="modal">
        <button className="flex-1 py-2 rounded-lg bg-white/[.06] border border-white/10 text-cream text-xs font-semibold hover:bg-white/10 transition-colors">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand to-rose-600 text-white text-xs font-semibold hover:from-brand-300 hover:to-rose-500 transition-colors shadow-md shadow-brand/20">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}

/* ── Static (no-Clerk) user section ── */
function StaticUserSection({ onNavigate }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.04] p-2.5 backdrop-blur-md">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/30 to-brand/10 text-xs font-bold text-cream ring-1 ring-brand/40 shadow-inner">
          TP
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-950" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-cream">TAAL Team</p>
          <p className="truncate text-[10px] text-mist">Operations CRM</p>
        </div>
      </div>
      {/* Login / Logout buttons for static mode */}
      <div className="flex gap-2">
        <button
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.04] px-2.5 py-2 text-xs font-medium text-mist transition-all hover:bg-white/[.08] hover:text-cream active:scale-95"
        >
          <Icon d={I.users} className="h-3.5 w-3.5" />
          Log In
        </button>
        <button
          onClick={() => onNavigate?.("Admin Panel")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 active:scale-95"
        >
          <Icon d={I.logout} className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </div>
  );
}

const Item = ({ icon, label, active, badge, onClick, accent, emoji }) => (
  <button
    onClick={() => onClick?.(label)}
    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200
    ${active
      ? accent === "admin"
        ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-cream border border-amber-500/30 shadow-[0_2px_12px_rgba(245,158,11,0.15)]"
        : "bg-gradient-to-r from-brand/22 via-brand/10 to-transparent text-cream border border-brand/30 shadow-[0_2px_12px_rgba(220,38,38,0.18)]"
      : "text-mist border border-transparent hover:translate-x-1 hover:bg-white/[.05] hover:text-cream"}`}
  >
    {active && (
      <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accent === "admin" ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)]" : "bg-brand shadow-[0_0_12px_rgba(220,38,38,0.9)]"}`} />
    )}
    {emoji
      ? <span className="relative text-base">{emoji}</span>
      : <Icon d={icon} className={`relative h-4 w-4 transition-colors ${active ? (accent === "admin" ? "text-amber-400" : "text-brand-300") : "text-mist group-hover:text-cream"}`} />}
    <span className="relative truncate">{label}</span>
    {label === "WhatsApp" && (
      <span className="relative ml-auto h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" title="WhatsApp Center" />
    )}
    {badge && label !== "WhatsApp" && (
      <span className="relative ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold-300 border border-gold/20">
        {badge}
      </span>
    )}
  </button>
);

function SidebarContent({ clerkEnabled, activePage, onNavigate, onClose }) {
  const handleNav = (label) => {
    onNavigate?.(label);
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Premium Integrated Logo & Header Bar */}
      <div className="relative shrink-0 overflow-hidden rounded-2xl border border-white/[.09] bg-gradient-to-b from-white/[.07] to-white/[.02] p-3 shadow-lg shadow-black/40 backdrop-blur-xl">
        <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-brand/20 blur-xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-brand/30 blur-md" />
              <img
                src="/taal-pathak-logo-red.png"
                alt="TAAL Logo"
                className="relative h-11 w-11 rounded-xl border border-white/10 bg-ink-950/90 object-contain p-1 shadow-md"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display text-base font-bold tracking-tight text-cream">TAAL</p>
                <span className="rounded-full bg-brand/20 px-1.5 py-0.2 text-[9px] font-bold text-brand-300 uppercase tracking-widest border border-brand/30">
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
          <p className="mb-2 px-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-semibold text-mist/60">
            <span className="h-px w-3 bg-mist/20" />
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
          <p className="mb-2 px-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-semibold text-amber-400/70">
            <span className="h-px w-3 bg-amber-400/30" />
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
      <div className="shrink-0 pt-3 border-t border-white/[.08]">
        {clerkEnabled
          ? <ClerkUserSection />
          : <StaticUserSection onNavigate={handleNav} />
        }
      </div>
    </div>
  );
}

export default function Sidebar({ clerkEnabled, activePage, onNavigate, mobileOpen, onClose }) {
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-white/[.08] bg-ink-950/85 px-4 py-5 shadow-[4px_0_24px_rgba(0,0,0,.4)] backdrop-blur-2xl">
        <SidebarContent
          clerkEnabled={clerkEnabled}
          activePage={activePage}
          onNavigate={onNavigate}
        />
      </aside>

      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[310px] max-w-[85vw] flex-col border-r border-white/10 bg-ink-950/98 p-4 shadow-[16px_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          clerkEnabled={clerkEnabled}
          activePage={activePage}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      </aside>
    </>
  );
}

