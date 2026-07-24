import { Icon, I } from "./icons";

export default function Topbar({ activePage = "Dashboard", onMenuToggle }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/72 backdrop-blur-2xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent" />
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-8 lg:py-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.045] text-cream shadow-glow transition-all active:scale-95"
          aria-label="Open menu"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand/12 to-gold/10" />
          <Icon d={I.menu} className="relative h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-brand/20 blur-md" />
            <img
              src="/taal-pathak-logo-red.png"
              alt="TAAL"
              className="relative h-10 w-10 rounded-xl border border-white/[.08] bg-ink-900/80 object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight text-cream sm:text-lg">
              {activePage}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald shadow-[0_0_12px_rgba(52,211,153,.7)]" />
              <p className="truncate text-[11px] text-mist">TAAL operations live</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/[.07] bg-white/[.04] px-3 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulseDot" />
          <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-mist">Live</span>
        </div>

        <button className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.045] text-mist transition-all hover:bg-white/[.07] hover:text-cream active:scale-95">
          <Icon d={I.bell} className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand ring-2 ring-ink-950 animate-pulseDot" />
        </button>
      </div>
    </header>
  );
}
