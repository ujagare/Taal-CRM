import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n🔍 Diagnosing dhol_maintenance table...\n')

// Test with anon key (what frontend uses)
const anonClient = createClient(supabaseUrl, anonKey)
const serviceClient = createClient(supabaseUrl, serviceKey)

// 1. Check if table exists and count rows (service key - bypasses RLS)
console.log('=== 1. Table exists? (Service Key - full access) ===')
const { data: allRows, error: e1 } = await serviceClient
  .from('dhol_maintenance')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (e1) {
  console.log('❌ ERROR with service key:', e1.message)
  console.log('   Code:', e1.code)
} else {
  console.log(`✅ Table exists. Total visible rows (last 10): ${allRows.length}`)
  if (allRows.length > 0) {
    console.log('   Latest entry:', JSON.stringify(allRows[0], null, 2))
  }
}

// 2. Check with anon key (what the browser uses)
console.log('\n=== 2. SELECT with Anon Key (what browser uses) ===')
const { data: anonRows, error: e2 } = await anonClient
  .from('dhol_maintenance')
  .select('*')
  .order('maintenance_date', { ascending: false })
  .limit(10)

if (e2) {
  console.log('❌ ERROR with anon key SELECT:', e2.message)
  console.log('   Code:', e2.code)
  console.log('   Hint:', e2.hint)
  console.log('   Details:', e2.details)
  if (e2.code === '42501' || e2.message.includes('permission') || e2.message.includes('RLS') || e2.message.includes('policy')) {
    console.log('🚨 RLS (Row Level Security) is BLOCKING SELECT! Fix needed.')
  }
} else {
  console.log(`✅ Anon key SELECT works. Rows returned: ${anonRows.length}`)
  if (anonRows.length > 0) {
    console.log('   Latest:', anonRows[0])
  }
}

// 3. Try INSERT with anon key (test save)
console.log('\n=== 3. INSERT Test with Anon Key (test save) ===')
const testPayload = {
  dhol_id: 999,
  dhol_number: 999,
  dhol_size: '28',
  maintenance_date: new Date().toISOString().slice(0, 10),
  description: '__TEST_ENTRY__',
  done_by: 'DiagnoseScript',
  done_by_2: null,
  notes: 'AUTO DELETE THIS TEST ENTRY',
}

const { data: insertData, error: e3 } = await anonClient
  .from('dhol_maintenance')
  .insert(testPayload)
  .select()

if (e3) {
  console.log('❌ ERROR with anon INSERT:', e3.message)
  console.log('   Code:', e3.code)
  console.log('   Hint:', e3.hint)
  if (e3.code === '42501' || e3.message.includes('permission') || e3.message.includes('RLS') || e3.message.includes('policy')) {
    console.log('🚨 RLS is BLOCKING INSERT! Need to enable INSERT policy in Supabase dashboard.')
  }
} else {
  console.log('✅ Anon INSERT works! Data saved.')
  console.log('   Inserted:', insertData)
  
  // Clean up test entry
  if (insertData && insertData[0]?.id) {
    const { error: delErr } = await serviceClient
      .from('dhol_maintenance')
      .delete()
      .eq('id', insertData[0].id)
    if (!delErr) console.log('   ✅ Test entry cleaned up.')
  }
}

// 4. Check RLS policies via information_schema
console.log('\n=== 4. Check Table Schema ===')
const { data: cols, error: e4 } = await serviceClient
  .rpc('get_table_info', { table_name: 'dhol_maintenance' })
  .catch(() => ({ data: null, error: { message: 'RPC not available' } }))

if (e4 || !cols) {
  // Try direct column query
  const { data: schemaData, error: schemaErr } = await serviceClient
    .from('dhol_maintenance')
    .select('id, dhol_id, dhol_number, dhol_size, maintenance_date, description, done_by, done_by_2, notes, created_at')
    .limit(1)
  
  if (schemaErr) {
    console.log('❌ Schema check error:', schemaErr.message)
  } else {
    console.log('✅ Table columns verified: id, dhol_id, dhol_number, dhol_size, maintenance_date, description, done_by, done_by_2, notes, created_at')
  }
} else {
  console.log('Schema info:', cols)
}

console.log('\n📋 SUMMARY:')
console.log('  - If anon SELECT failed → Add SELECT policy in Supabase Dashboard')
console.log('  - If anon INSERT failed → Add INSERT policy in Supabase Dashboard')
console.log('  - Go to: Supabase Dashboard → Table Editor → dhol_maintenance → RLS Policies')
console.log('  - Or run the fix SQL shown below\n')
