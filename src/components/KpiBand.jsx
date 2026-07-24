import { useId } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { money } from '../lib/format'
import { smoothPath } from '../lib/chart'
import { Icon, I } from './icons'

function Spark({ data, color = '#DC2626', w = 180, h = 50 }) {
  const id = useId().replace(/:/g, '')
  if (!data || data.length === 0) return <svg width={w} height={h} />
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => ({ x: i / (data.length - 1) * w, y: h - 5 - (v - min) / (max - min || 1) * (h - 10) }))
  if (pts.length === 0) return <svg width={w} height={h} />
  return (
    <svg width={w} height={h}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${smoothPath(pts)} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" pathLength="1" className="draw" />
      <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="3.5" fill={color} opacity=".9" />
    </svg>
  )
}

function StatRow({ icon, tint, label, value, sub, delay }) {
  return (
    <div className="card-premium px-5 py-4 flex items-center gap-4 animate-rise-delayed" style={{ animationDelay: `${delay}ms` }}>
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tint} ring-1 ring-current/10`}><Icon d={icon} /></span>
      <div className="min-w-0">
        <p className="text-[11px] tracking-[.14em] uppercase text-mist">{label}</p>
        <p className="font-display text-2xl tabular-nums leading-tight">{value}</p>
      </div>
      <p className="ml-auto text-xs text-mist text-right">{sub}</p>
    </div>
  )
}

export default function KpiBand({ deals, metrics }) {
  const q = metrics.slice(-3).reduce((s, m) => s + m.revenue, 0)
  const prev = metrics.slice(-6, -3).reduce((s, m) => s + m.revenue, 0)
  const target = metrics.slice(-3).reduce((s, m) => s + m.target, 0)
  const delta = prev ? (q - prev) / prev * 100 : 0
  const qAnim = useCountUp(q)

  const open = deals.filter(d => d.stage !== 'Closed Won')
  const pipeline = open.reduce((s, d) => s + Number(d.value), 0)
  const won = deals.filter(d => d.stage === 'Closed Won').length
  const winRate = deals.length ? Math.round(won / deals.length * 100) : 0
  const pipeAnim = useCountUp(pipeline)
  const winAnim = useCountUp(winRate)
  const pct = Math.min(100, q / target * 100)

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-5">
      {/* Revenue Hero Card */}
      <div className="card-premium p-6 relative overflow-hidden group">
        {/* subtle gold top border */}
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="absolute top-6 right-6 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          <Spark data={metrics.slice(-8).map(m => m.revenue)} />
        </div>
        <p className="text-[11px] tracking-[.18em] uppercase text-mist/80">Revenue · Q3 2026</p>
        <div className="flex items-end gap-3 mt-1.5">
          <p className="font-display text-5xl tabular-nums tracking-tight">{money(qAnim, { compact: true })}</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-gold-300 bg-gold/10 border border-gold/20 rounded-full px-2 py-1 mb-2">
            <Icon d={I.trend} className="w-3 h-3" /> +{delta.toFixed(1)}%
          </span>
        </div>
        <div className="mt-5 max-w-sm">
          <div className="flex justify-between text-[11px] text-mist mb-2">
            <span>Quarter target</span><span className="tabular-nums font-medium text-cream/80">{pct.toFixed(0)}% of {money(target, true)}</span>
          </div>
          <div className="h-1 rounded-full bg-ink-700/40 overflow-hidden relative">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-300 transition-all duration-1000 relative" style={{ width: `${pct}%` }}>
              <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gold-300 shadow-[0_0_8px_rgba(245,158,11,.5)]" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-5">
        <StatRow icon={I.briefcase} tint="bg-gold/12 text-gold-300" label="Open Pipeline"
          value={money(pipeAnim, { compact: true })} sub={`${open.length} active deals`} delay={0} />
        <StatRow icon={I.target} tint="bg-brand/12 text-brand-300" label="Win Rate"
          value={`${Math.round(winAnim)}%`} sub={`${won} closed won`} delay={120} />
        <StatRow icon={I.dollar} tint="bg-sky/12 text-sky" label="Avg. Deal Size"
          value={money(open.length ? pipeline / open.length : 0, { compact: true })} sub="across open deals" delay={240} />
      </div>
    </section>
  )
}
