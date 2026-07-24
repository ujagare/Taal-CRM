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
      <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.04] p-2">
        <UserButton />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <p className="truncate text-[11px] text-mist">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-400 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-300 group"
      >
        <Icon d={I.logout} className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
        <span>Logout</span>
      </button>
    </div>
  ) : (
    <div className="flex gap-2 w-full">
      <SignInButton mode="modal">
        <button className="flex-1 py-2 rounded-lg bg-ink-800 text-cream text-xs font-semibold hover:bg-ink-700 transition-colors">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="flex-1 py-2 rounded-lg bg-brand text-ink-950 text-xs font-semibold hover:bg-brand-300 transition-colors">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}

/* ── Static (no-Clerk) user section ── */
function StaticUserSection({ onNavigate }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.04] p-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand-300 ring-1 ring-white/10">
          TP
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">TAAL Team</p>
          <p className="truncate text-[11px] text-mist">Operations CRM</p>
        </div>
      </div>
      {/* Login / Logout buttons for static mode */}
      <div className="flex gap-2">
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[.07] bg-white/[.04] px-3 py-2 text-xs font-semibold text-mist transition-colors hover:bg-white/[.07] hover:text-cream"
        >
          <Icon d={I.users} className="h-4 w-4" />
          Log In
        </button>
        <button
          onClick={() => onNavigate?.("Admin Panel")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
        >
          <Icon d={I.logout} className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

const Item = ({ icon, label, active, badge, onClick, accent }) => (
  <button
    onClick={() => onClick?.(label)}
    className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200
    ${active
      ? accent === "admin"
        ? "bg-gradient-to-r from-amber-500/14 to-white/[.035] text-cream shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"
        : "bg-gradient-to-r from-brand/14 to-white/[.035] text-cream shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"
      : "text-mist hover:translate-x-0.5 hover:bg-white/[.045] hover:text-cream"}`}
  >
    {active && (
      <>
        <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full ${accent === "admin" ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,.65)]" : "bg-brand shadow-[0_0_12px_rgba(220,38,38,.65)]"}`} />
        <span className={`absolute inset-0 rounded-lg ring-1 ring-inset ${accent === "admin" ? "ring-amber-400/20" : "ring-brand/20"}`} />
      </>
    )}
    <Icon d={icon} className={`relative h-[18px] w-[18px] ${active && accent === "admin" ? "text-amber-400" : ""}`} />
    <span className="relative font-medium">{label}</span>
    {badge && (
      <span className="relative ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold-300">
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
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="relative overflow-hidden rounded-xl border border-white/[.07] bg-white/[.035] p-3">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,rgba(220,38,38,.18),transparent_55%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-brand/20 blur-md" />
              <img
                src="/taal-pathak-logo-red.png"
                alt="TAAL"
                className="relative h-12 w-12 rounded-xl border border-white/[.08] bg-ink-900/80 object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight">TAAL</p>
              <p className="truncate text-[10px] uppercase tracking-[.18em] text-mist">Operations CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[.07] bg-white/[.045] text-mist transition-colors hover:text-cream lg:hidden"
            aria-label="Close menu"
          >
            <Icon d={I.x} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main nav */}
      <p className="mb-2 mt-6 flex items-center gap-2 px-3 text-[10px] uppercase tracking-[.2em] text-mist/70">
        <span className="h-px w-4 bg-mist/25" />
        Workspace
      </p>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <Item key={n.label} {...n} active={activePage === n.label} onClick={handleNav} />
        ))}
      </nav>

      {/* Admin section */}
      <p className="mb-2 mt-7 flex items-center gap-2 px-3 text-[10px] uppercase tracking-[.2em] text-amber-400/70">
        <span className="h-px w-4 bg-amber-400/25" />
        Administration
      </p>
      <nav className="space-y-1">
        {ADMIN_NAV.map((n) => (
          <Item key={n.label} {...n} accent="admin" active={activePage === n.label} onClick={handleNav} />
        ))}
      </nav>

      {/* User / Auth section at bottom */}
      <div className="mt-auto space-y-4">
        <div className="border-t hairline pt-4">
          {clerkEnabled
            ? <ClerkUserSection />
            : <StaticUserSection onNavigate={handleNav} />
          }
        </div>
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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-white/[.06] bg-ink-900/80 px-4 py-6 shadow-[4px_0_24px_rgba(0,0,0,.2)] backdrop-blur-xl">
        <SidebarContent
          clerkEnabled={clerkEnabled}
          activePage={activePage}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      </aside>

      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-opacity duration-300 lg:hidden
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[88vw] flex-col border-r border-white/[.07] bg-ink-900/96 px-5 py-5 shadow-[12px_0_50px_rgba(0,0,0,.45)] backdrop-blur-2xl transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
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
