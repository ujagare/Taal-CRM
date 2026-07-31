import { Icon, I } from "./icons";

export default function Topbar({ activePage = "Dashboard", onMenuToggle }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-2xl shadow-[0_2px_16px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-8 lg:py-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuToggle}
          className="
            lg:hidden relative grid h-10 w-10 shrink-0 place-items-center rounded-xl
            border border-slate-200/80 bg-white text-slate-700 shadow-sm
            hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all duration-200 cursor-pointer
          "
          aria-label="Open menu"
        >
          <Icon d={I.menu} className="h-5 w-5" />
        </button>

        {/* Page Title & Status */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-red-500/10 blur-sm" />
            <img
              src="/taal-pathak-logo-red.png"
              alt="TAAL"
              className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-tight text-slate-900 sm:text-lg tracking-tight">
              {activePage}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="truncate text-[11px] font-medium text-slate-500">TAAL operations live</p>
            </div>
          </div>
        </div>

        {/* Live System Pill */}
        <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3.5 py-1.5 shadow-sm sm:flex">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Live</span>
        </div>

        {/* Notification Bell */}
        <button
          className="
            relative grid h-10 w-10 shrink-0 place-items-center rounded-xl
            border border-slate-200/80 bg-white text-slate-600 shadow-sm
            hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all duration-200 cursor-pointer
          "
          title="Notifications"
        >
          <Icon d={I.bell} className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
