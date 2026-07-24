// Seed 54 dhols into Supabase dhols table
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

console.log('Connecting to:', SUPABASE_URL?.slice(0, 40), '...')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 54 dhols: 1-10 = 30", 11-52 = 28", 53-54 = 26"
const DHOLS = []
for (let i = 1; i <= 54; i++) {
  let size
  if (i <= 10) size = 30
  else if (i <= 52) size = 28
  else size = 26
  DHOLS.push({ dhol_number: i, size, maker_name: null, notes: null })
}

console.log(`Seeding ${DHOLS.length} dhols...`)

// Check table exists
const { data: existing, error: checkErr } = await supabase.from('dhols').select('id').limit(1)

if (checkErr) {
  console.log('Table access error:', checkErr.message)
  console.log('\nRun this SQL in Supabase SQL Editor first:')
  console.log(`
CREATE TABLE IF NOT EXISTS dhols (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  dhol_number INTEGER UNIQUE NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (26, 28, 30)),
  maker_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dhol_maintenance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  dhol_id BIGINT NOT NULL REFERENCES dhols(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL DEFAULT now(),
  description TEXT NOT NULL DEFAULT 'सफाई',
  done_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
  `.trim())
  process.exit(1)
}

console.log('Table accessible. Upserting dhols...')

let inserted = 0
let updated = 0

for (const dhol of DHOLS) {
  const { data: found } = await supabase.from('dhols').select('id').eq('dhol_number', dhol.dhol_number).maybeSingle()

  if (found) {
    const { error } = await supabase.from('dhols').update({ size: dhol.size }).eq('id', found.id)
    if (error) {
      console.log(`  Failed update #${dhol.dhol_number}: ${error.message}`)
    } else {
      updated++
    }
  } else {
    const { error } = await supabase.from('dhols').insert(dhol)
    if (error) {
      console.log(`  Failed insert #${dhol.dhol_number}: ${error.message}`)
    } else {
      inserted++
    }
  }
}

console.log(`Done! Inserted: ${inserted}, Updated: ${updated}, Total: ${DHOLS.length}`)
console.log('\nSummary:')
console.log(`  30" (1-10):   10 dhols`)
console.log(`  28" (11-52):  42 dhols`)
console.log(`  26" (53-54):   2 dhols`)
process.exit(0)
