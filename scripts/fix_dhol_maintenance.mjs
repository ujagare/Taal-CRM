import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const client = createClient(supabaseUrl, anonKey)

console.log('\n🔧 Fixing Supabase dhol_maintenance issues...\n')

// 1. Delete the test entry left from diagnostic
console.log('=== Cleaning up test entry (id=1, dhol_number=999) ===')
const { error: delErr } = await client
  .from('dhol_maintenance')
  .delete()
  .eq('dhol_number', 999)

if (delErr) {
  console.log('❌ Could not delete test entry (might need manual delete):', delErr.message)
} else {
  console.log('✅ Test entry cleaned up')
}

// 2. Check what's actually in the table now
console.log('\n=== All rows in dhol_maintenance (anon key) ===')
const { data: rows, error: selErr } = await client
  .from('dhol_maintenance')
  .select('*')
  .order('created_at', { ascending: false })

if (selErr) {
  console.log('❌ SELECT still failing:', selErr.message)
  console.log('   Code:', selErr.code)
  
  console.log('\n🚨 RLS IS BLOCKING SELECT QUERIES')
  console.log('   You need to add a SELECT policy in Supabase Dashboard:')
  console.log('   1. Go to: https://supabase.com/dashboard/project/rnpsuwkkafxufuqucikz/auth/policies')
  console.log('   2. Find table: dhol_maintenance')
  console.log('   3. Click "New Policy" → "Create a policy from scratch"')
  console.log('   4. Policy Name: "Allow public select"')
  console.log('   5. Command: SELECT')
  console.log('   6. USING expression: true')
  console.log('   7. Save')
  console.log('\n   OR run this SQL in SQL Editor:')
  console.log('   ALTER TABLE dhol_maintenance ENABLE ROW LEVEL SECURITY;')
  console.log('   CREATE POLICY "Allow anon select" ON dhol_maintenance FOR SELECT USING (true);')
  console.log('   CREATE POLICY "Allow anon insert" ON dhol_maintenance FOR INSERT WITH CHECK (true);')
  console.log('   CREATE POLICY "Allow anon delete" ON dhol_maintenance FOR DELETE USING (true);')
} else {
  console.log(`✅ SELECT works! Found ${rows.length} rows`)
  rows.forEach((r, i) => {
    console.log(`   ${i+1}. Dhol #${r.dhol_number} | ${r.maintenance_date} | ${r.description} | by: ${r.done_by}`)
  })
  
  if (rows.length === 0) {
    console.log('\n⚠️  Table is empty. This is why data disappears on refresh - nothing is being saved OR data was inserted but SELECT is filtering incorrectly.')
    
    // Try inserting a real test entry
    console.log('\n=== Testing real data insert ===')
    const { data: testInsert, error: testErr } = await client
      .from('dhol_maintenance')
      .insert({
        dhol_id: 1,
        dhol_number: 1,
        dhol_size: '30',
        maintenance_date: new Date().toISOString().slice(0, 10),
        description: 'Normal Dhol',
        done_by: 'TestUser',
      })
      .select()
    
    if (testErr) {
      console.log('❌ INSERT failed:', testErr.message)
    } else {
      console.log('✅ INSERT succeeded:', testInsert)
      
      // Now try SELECT again
      const { data: recheck, error: recheckErr } = await client
        .from('dhol_maintenance')
        .select('*')
      
      if (recheckErr) {
        console.log('❌ SELECT still failing after insert:', recheckErr.message)
      } else {
        console.log(`✅ SELECT after insert: ${recheck.length} rows found`)
        console.log('   Data is being saved AND can be read. RLS is OK.')
        
        // Clean up test
        if (testInsert && testInsert[0]?.id) {
          await client.from('dhol_maintenance').delete().eq('id', testInsert[0].id)
          console.log('   ✅ Test entry cleaned up')
        }
      }
    }
  }
}
