import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

if (!supabase) {
  console.warn('[taal] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory mock data.')
}

// In-memory fallback used when Supabase is not configured
const MOCK_DEALS = [
  { id: 1, company: 'Northwind Traders', owner: 'Ava Patel', stage: 'Negotiation', priority: 'high', value: 48000, close: '2026-08-12' },
  { id: 2, company: 'Globex Corp', owner: 'Liam Chen', stage: 'Proposal', priority: 'medium', value: 32000, close: '2026-08-20' },
  { id: 3, company: 'Initech', owner: 'Sofia Rossi', stage: 'Qualified', priority: 'low', value: 21500, close: '2026-09-02' },
  { id: 4, company: 'Stark Industries', owner: 'Liam Chen', stage: 'Closed Won', priority: 'high', value: 92000, close: '2026-07-30' },
]

const WEIGHTS = { 'Discovery': 0.15, 'Proposal': 0.4, 'Negotiation': 0.7, 'Closed Won': 1 }

app.get('/api/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }))

app.get('/api/summary', async (_req, res) => {
  try {
    let deals
    if (supabase) {
      const { data, error } = await supabase.from('deals').select('stage,value')
      // Fall back to mock when the deals table isn't provisioned (PGRST205 = missing from schema cache)
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        deals = MOCK_DEALS
      } else {
        if (error) throw error
        deals = data
      }
    } else {
      deals = MOCK_DEALS
    }
    const open = deals.filter((d) => d.stage !== 'Closed Won')
    res.json({
      openCount: open.length,
      pipeline: open.reduce((s, d) => s + Number(d.value), 0),
      forecast: Math.round(open.reduce((s, d) => s + Number(d.value) * (WEIGHTS[d.stage] || 0), 0)),
      closed: deals.filter((d) => d.stage === 'Closed Won').reduce((s, d) => s + Number(d.value), 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => console.log(`◆ TAAL Maintenance API on http://localhost:${PORT}`))
