// Seed dhol_pan table with old + new pane data
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

const SEED = [
  { pane_type: 'old', size: '२६"', thapi: 3, dhoom: 3 },
  { pane_type: 'old', size: '२८"', thapi: 39, dhoom: 51 },
  { pane_type: 'old', size: '३०"', thapi: 8, dhoom: 9 },
  { pane_type: 'new', size: '२६"', thapi: 0, dhoom: 0 },
  { pane_type: 'new', size: '२८"', thapi: 0, dhoom: 0 },
  { pane_type: 'new', size: '३०"', thapi: 0, dhoom: 0 },
]

console.log('Checking dhol_pan table...')
const { data: existing, error: checkErr } = await supabase.from('dhol_pan').select('id').limit(1)

if (checkErr) {
  console.log('Table access error:', checkErr.message)
  console.log('\nRun this SQL in Supabase SQL Editor first:')
  console.log(`
ALTER TABLE dhol_pan ADD COLUMN IF NOT EXISTS pane_type TEXT NOT NULL DEFAULT 'old';
ALTER TABLE dhol_pan DROP CONSTRAINT IF EXISTS dhol_pan_size_key;
ALTER TABLE dhol_pan ADD CONSTRAINT dhol_pan_pane_type_size_key UNIQUE(pane_type, size);
  `.trim())
  process.exit(1)
}

console.log('Table accessible. Seeding data...')

// Upsert each row
for (const row of SEED) {
  const { error } = await supabase.from('dhol_pan').upsert(row, { onConflict: 'pane_type,size' })
  if (error) {
    // If upsert fails due to schema mismatch, try insert with update
    const { error: err2 } = await supabase.from('dhol_pan')
      .update({ thapi: row.thapi, dhoom: row.dhoom })
      .eq('pane_type', row.pane_type).eq('size', row.size)
    if (err2) {
      console.log(`  Failed for ${row.pane_type}/${row.size}: ${err2.message}`)
    } else {
      console.log(`  Updated ${row.pane_type}/${row.size}`)
    }
  } else {
    console.log(`  Upserted ${row.pane_type}/${row.size}`)
  }
}

console.log('Done!')
process.exit(0)
