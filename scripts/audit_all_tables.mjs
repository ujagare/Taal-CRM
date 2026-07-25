import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const tablesToTest = [
  { name: 'new_members', sample: { full_name: 'Audit Test Member', whatsapp: '0000000000', exam_status: 'pending' } },
  { name: 'expenses', sample: { title: 'Audit Test Expense', amount: 100, category: 'other', date: '2026-07-25' } },
  { name: 'daily_reports', sample: { report_date: '2026-07-25', work_type: 'Audit Test Report', repair_status: 'Pending' } },
  { name: 'dhol_pan', sample: { dhol_number: 999, size: 28, status: 'Good' } },
  { name: 'dhol_maintenance', sample: { dhol_number: 999, size: 28, repair_type: 'Audit Test', status: 'Pending' } },
  { name: 'dhols', sample: { dhol_number: 999, size: 28 } },
  { name: 'students', sample: { name: 'Audit Student', phone: '0000000000' } },
  { name: 'batches', sample: { name: 'Audit Batch' } },
  { name: 'attendance', sample: { date: '2026-07-25', status: 'Present' } },
  { name: 'auth_activity_logs', sample: { user_name: 'Audit', event_type: 'login' } },
  { name: 'deals', sample: { company: 'Audit Company', title: 'Audit Deal', stage: 'Lead', value: 1000 } },
  { name: 'tasks', sample: { title: 'Audit Task', priority: 'Medium' } },
]

console.log('🔍 AUDITING ALL SUPABASE TABLES FOR READ, INSERT, UPDATE, AND RLS...\n')

const results = []

for (const t of tablesToTest) {
  const audit = { table: t.name, select: 'FAIL', insert: 'FAIL', update: 'FAIL', rowCount: 0, notes: '' }

  // 1. Test SELECT
  const { data: selectData, error: selectErr } = await supabase.from(t.name).select('*').limit(5)
  if (selectErr) {
    audit.select = `❌ FAIL (${selectErr.message})`
  } else {
    audit.select = `✅ OK`
    audit.rowCount = selectData ? selectData.length : 0
  }

  // 2. Test INSERT
  const { data: insertData, error: insertErr } = await supabase.from(t.name).insert([t.sample]).select()
  if (insertErr) {
    audit.insert = `❌ FAIL (${insertErr.message})`
  } else {
    audit.insert = `✅ OK`
    const insertedId = insertData && insertData.length > 0 ? insertData[0].id : null

    // 3. Test UPDATE (if insert succeeded)
    if (insertedId) {
      const { error: updateErr } = await supabase.from(t.name).update({ notes: 'Audit updated' }).eq('id', insertedId)
      if (updateErr) {
        audit.update = `❌ FAIL (${updateErr.message})`
      } else {
        audit.update = `✅ OK`
      }

      // Cleanup test row
      await supabase.from(t.name).delete().eq('id', insertedId)
    }
  }

  results.push(audit)
}

console.table(results)
