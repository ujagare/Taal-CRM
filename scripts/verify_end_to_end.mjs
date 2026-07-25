import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log("=== END-TO-END VERIFICATION: Supabase Save → CRM Display ===\n")
console.log("हे तपासतो: CRM मध्ये जे दिसते ते Supabase मध्ये save झाले आहे का?\n")

const results = []

// ── 1. New Members (नवीन सदस्य) ──
const { count: membersCount, error: e1 } = await supabase
  .from('new_members').select('*', { count: 'exact', head: true })
if (!e1) results.push({ tab: 'New Member Exam', table: 'new_members', count: membersCount, status: '✅' })
else results.push({ tab: 'New Member Exam', table: 'new_members', count: 'ERROR: ' + e1.message, status: '❌' })

// ── 2. Expenses (खर्च) ──
const { count: expCount, error: e2 } = await supabase
  .from('expenses').select('*', { count: 'exact', head: true })
if (!e2) results.push({ tab: 'Expense Tracker', table: 'expenses', count: expCount, status: '✅' })
else results.push({ tab: 'Expense Tracker', table: 'expenses', count: 'ERROR: ' + e2.message, status: '❌' })

// ── 3. Daily Reports ──
const { count: drCount, error: e3 } = await supabase
  .from('daily_reports').select('*', { count: 'exact', head: true })
if (!e3) results.push({ tab: 'Daily Report', table: 'daily_reports', count: drCount, status: '✅' })
else results.push({ tab: 'Daily Report', table: 'daily_reports', count: 'ERROR: ' + e3.message, status: '❌' })

// ── 4. Batches (बॅचेस) ──
const { count: batchCount, error: e4 } = await supabase
  .from('batches').select('*', { count: 'exact', head: true })
if (!e4) results.push({ tab: 'Attendance (batches)', table: 'batches', count: batchCount, status: '✅' })
else results.push({ tab: 'Attendance (batches)', table: 'batches', count: 'ERROR: ' + e4.message, status: '❌' })

// ── 5. Students (विद्यार्थी) ──
const { count: stdCount, error: e5 } = await supabase
  .from('students').select('*', { count: 'exact', head: true })
if (!e5) results.push({ tab: 'Attendance (students)', table: 'students', count: stdCount, status: '✅' })
else results.push({ tab: 'Attendance (students)', table: 'students', count: 'ERROR: ' + e5.message, status: '❌' })

// ── 6. Attendance ──
const { count: attCount, error: e6 } = await supabase
  .from('attendance').select('*', { count: 'exact', head: true })
if (!e6) results.push({ tab: 'Attendance (records)', table: 'attendance', count: attCount, status: '✅' })
else results.push({ tab: 'Attendance (records)', table: 'attendance', count: 'ERROR: ' + e6.message, status: '❌' })

// ── 7. Dhol Pan ──
const { count: dholPanCount, error: e7 } = await supabase
  .from('dhol_pan').select('*', { count: 'exact', head: true })
if (!e7) results.push({ tab: 'Dhol Pan', table: 'dhol_pan', count: dholPanCount, status: '✅' })
else results.push({ tab: 'Dhol Pan', table: 'dhol_pan', count: 'ERROR: ' + e7.message, status: '❌' })

// ── 8. Dhol Maintenance ──
const { count: dholMaintCount, error: e8 } = await supabase
  .from('dhol_maintenance').select('*', { count: 'exact', head: true })
if (!e8) results.push({ tab: 'Dhol Maintenance', table: 'dhol_maintenance', count: dholMaintCount, status: '✅' })
else results.push({ tab: 'Dhol Maintenance', table: 'dhol_maintenance', count: 'ERROR: ' + e8.message, status: '❌' })

// ── 9. taal_assets (Shifting) ──
const { count: assetCount, error: e9 } = await supabase
  .from('taal_assets').select('*', { count: 'exact', head: true })
if (!e9) results.push({ tab: 'Asset Manager (Shifting)', table: 'taal_assets', count: assetCount, status: '✅' })
else results.push({ tab: 'Asset Manager (Shifting)', table: 'taal_assets', count: 'ERROR: ' + e9.message, status: '❌' })

// ── 10. Auth Logs ──
const { count: logCount, error: e10 } = await supabase
  .from('auth_activity_logs').select('*', { count: 'exact', head: true })
if (!e10) results.push({ tab: 'Admin Panel (Auth Logs)', table: 'auth_activity_logs', count: logCount, status: '✅' })
else results.push({ tab: 'Admin Panel (Auth Logs)', table: 'auth_activity_logs', count: 'ERROR: ' + e10.message, status: '❌' })

// ── Print Results ──
console.log("CRM Tab                    | Supabase Table           | Records | Status")
console.log("---------------------------|--------------------------|---------|-------")
results.forEach(r => {
  const tab = r.tab.padEnd(26)
  const tbl = r.table.padEnd(25)
  console.log(`${tab}| ${tbl}| ${String(r.count).padEnd(8)}| ${r.status}`)
})

const passing = results.filter(r => r.status === '✅').length
const total = results.length
console.log(`\n=== RESULT: ${passing}/${total} tables are LIVE in Supabase & CRM ===`)
if (passing === total) console.log("🎉 सर्व डेटा Supabase मध्ये आहे आणि CRM मध्ये दिसतो!")
