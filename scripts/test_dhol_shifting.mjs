import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log("=== TESTING DHOL MAINTENANCE & SHIFTING DATA SAVE ===\n")

// ── TEST 1: taal_assets (Shifting)
const assetPayload = {
  item: 'Test Asset - Auto Delete',
  qty: '2',
  custodian: 'System Test',
  category: 'Dhol',
  location: 'Pune',
  note: 'Auto verify test',
}

const { data: asset, error: assetErr } = await supabase
  .from('taal_assets')
  .insert(assetPayload)
  .select()
  .single()

if (assetErr) {
  console.log('❌ Shifting (taal_assets) FAILED:', assetErr.message)
} else {
  console.log('✅ Shifting (taal_assets) OK — ID:', asset.id)
  await supabase.from('taal_assets').delete().eq('id', asset.id)
  console.log('   (test record deleted)\n')
}

// ── TEST 2: dhol_maintenance (columns: id, dhol_id, maintenance_date, description, done_by, done_by_2, dhol_number, dhol_size)
const maintPayload = {
  dhol_number: 9999,
  dhol_size: 'Ched',
  maintenance_date: new Date().toISOString().split('T')[0],
  description: 'Auto verify test',
  done_by: 'System Test',
}

const { data: maint, error: maintErr } = await supabase
  .from('dhol_maintenance')
  .insert(maintPayload)
  .select()
  .single()

if (maintErr) {
  console.log('❌ Dhol Maintenance (dhol_maintenance) FAILED:', maintErr.message)
} else {
  console.log('✅ Dhol Maintenance (dhol_maintenance) OK — ID:', maint.id)
  await supabase.from('dhol_maintenance').delete().eq('id', maint.id)
  console.log('   (test record deleted)\n')
}

console.log("=== DONE ===")
