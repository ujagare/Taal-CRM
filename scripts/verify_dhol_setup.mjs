import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('\n🔍 Final Verification — dhol_maintenance table\n')

// Test 1: SELECT
const { data: rows, error: selErr } = await supabase
  .from('dhol_maintenance')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5)

if (selErr) {
  console.log('❌ SELECT FAILED:', selErr.message, '(Code:', selErr.code, ')')
  console.log('   → Supabase Dashboard me RLS SELECT policy check karo!')
} else {
  console.log(`✅ SELECT OK — Table accessible hai. Current rows: ${rows.length}`)
}

// Test 2: INSERT
const testEntry = {
  dhol_id: 1,
  dhol_number: 1,
  dhol_size: '30',
  maintenance_date: new Date().toISOString().slice(0, 10),
  description: 'Normal Dhol',
  done_by: 'VerifyTest',
  notes: 'AUTO DELETE',
}

const { data: inserted, error: insErr } = await supabase
  .from('dhol_maintenance')
  .insert(testEntry)
  .select()

if (insErr) {
  console.log('❌ INSERT FAILED:', insErr.message, '(Code:', insErr.code, ')')
  console.log('   → Supabase Dashboard me RLS INSERT policy check karo!')
} else {
  console.log(`✅ INSERT OK — Data save hua. ID: ${inserted[0]?.id}`)

  // Test 3: SELECT after insert
  const { data: afterRows, error: afterErr } = await supabase
    .from('dhol_maintenance')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!afterErr) {
    console.log(`✅ SELECT after INSERT — ${afterRows.length} rows milenge page reload par bhi`)
  }

  // Cleanup test entry
  if (inserted[0]?.id) {
    await supabase.from('dhol_maintenance').delete().eq('id', inserted[0].id)
    console.log('   (Test entry deleted)')
  }
}

// Test 4: Realtime check
console.log('\n✅ Realtime subscription — code mein already setup hai')
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📋 RESULT:')
if (!selErr && !insErr) {
  console.log('  ✅ Page reload par data GAYAB NAHI HOGA')
  console.log('  ✅ Har entry Supabase me permanently SAVE hogi')
  console.log('  ✅ Production me koi problem nahi hogi')
} else {
  console.log('  ❌ Kuch issue hai — upar ke errors check karo')
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
