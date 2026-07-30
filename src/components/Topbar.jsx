import { Icon, I } from "./icons";

export default function Topbar({ activePage = "Dashboard", onMenuToggle }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0_1px_20px_rgba(15,23,42,.04)]">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-8 lg:py-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-cream shadow-sm transition-all active:scale-95"
          aria-label="Open menu"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand/8 to-gold/8" />
          <Icon d={I.menu} className="relative h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-brand/10 blur-md" />
            <img
              src="/taal-pathak-logo-red.png"
              alt="TAAL"
              className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight text-cream sm:text-lg">
              {activePage}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald shadow-[0_0_12px_rgba(5,150,105,.45)]" />
              <p className="truncate text-[11px] text-mist">TAAL operations live</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulseDot" />
          <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-mist">Live</span>
        </div>

        <button className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-mist shadow-sm transition-all hover:bg-rose-50 hover:text-brand active:scale-95">
          <Icon d={I.bell} className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white animate-pulseDot" />
        </button>
      </div>
    </header>
  );
}
